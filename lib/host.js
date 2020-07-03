const { createLogger, format, transports } = require('winston');
const { spawn } = require("node-pty");
const signalhubws = require("signalhubws");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const argon2 = require("argon2")
const { randomStr, decrypt, encrypt, wrap, unwrap, generateKeys } = require("./utils");
const { DATA, PTY_EXIT, RESIZE } = require('./constants');
const owasp = require('owasp-password-strength-test');
const Conf = require("conf");
const os = require("os");
const inquirer = require("inquirer");
const ora = require("ora");
const sshpk = require('sshpk');
const isUrl = require("is-url");

const customFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.splat(),
    customFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'icettyd.log' })
  ]
});

//config
const config = new Conf({
  projectName: "icettyd",
  defaults: {
    retryInterval: 30000,
    loginRetryCount: 2,
    signallingTimeout: 30000,
    loginTimeout: 30000
  }
});

// signal hub
let hub;

const setup = async () => {
  if (!config.has("channel")) {
    const channel = await randomStr(32);
    config.set("channel", channel);
  }

  if (!config.has("pub") || !config.has("priv")) {
    const spinner = ora("Generating host keys").start()
    const keypair = await generateKeys();
    config.set("pub", keypair.publicKey.replace(/\r\n/g, '\n'));
    config.set("priv", keypair.privateKey.replace(/\r\n/g, '\n'));
    spinner.stop()
  }

  await inquirer.prompt([
    {
      type: "input",
      name: "signallingServer",
      message: "Signalling server to use",
      default: "wss://icetty-253311.appspot.com",
      when: () => {
        return !config.has("signallingServer")
      },
      validate: (input, answers) => {
        if (input && isUrl(input)) {
          config.set("signallingServer", input)
          return true
        } else {
          return "Not a valid URL"
        }
      }
    }, {
      type: "password",
      name: "password",
      message: "Password",
      when: () => {
        return !config.has("pass")
      },
      validate: (input, answers) => {
        if (!input) {
          return "Password is required!"
        }
        const result = owasp.test(input);
        if (result.errors && result.errors.length) {
          return result.errors.toString()
        }
        return true
      }
    },
    {
      type: "password",
      name: "passwordRepeat",
      message: "Password Repeat",
      when: () => {
        return !config.has("pass")
      },
      validate: async (input, answers) => {
        if (input != answers.password) {
          return "Passwords don't match"
        }
        try {
          const hash = await argon2.hash(answers.password);
          config.set("pass", hash)
          return true
        } catch (e) {
          return e.toString()
        }
      }
    }])
}

const addClient = async () => {
  await inquirer.prompt([
    {
      type: "input",
      name: "clientPub",
      message: "Add new client key (on the client side: 'icetty --key')",
      when: () => {
        return !config.has("clientPubs")
      },
      validate: (input) => {
        try {
          const sshKey = sshpk.parseKey(input, "ssh")
          const pub = sshKey.toBuffer('pem').toString()
          addClientPub(pub)
          return true
        } catch (e) {
          return e.toString()
        }
      }
    }])
}

const start = () => {
  const hostChannel = config.get("channel");
  const retryInterval = config.get("retryInterval");
  let retryHandle;
  const connect = () => {
    logger.info("attempting to connect to signalling server: " + config.get("signallingServer"));
    hub = signalhubws("icetty", [config.get("signallingServer")], require('ws'));
    hub.on('error', (err) => {
      logger.error(err.event.error.message)
      if (!retryHandle) {
        retryHandle = setInterval(connect, retryInterval)
      }
    })
    hub.on('close', () => {
      logger.info('connection to signalling server closed')
      if (!retryHandle) {
        retryHandle = setInterval(() => connect, retryInterval)
      }
    })
    hub.on('open', (err) => {
      logger.info("connected to signalling server: " + config.get("signallingServer"));
      logger.info("host id: " + hostChannel);

      if (retryHandle) {
        clearInterval(retryHandle)
        retryHandle = null;
      }

      hub.subscribe(hostChannel)
        .on("data", handleClient);
    })
  }

  connect();
};

const handleClient = async (clientinfo) => {
  logger.info("clientinfo: %o", clientinfo);

  if (!clientinfo.pub || !clientinfo.channel) {
    throw new Error("Invalid clientinfo");
  }

  try {
    let peer = await signalling(clientinfo.channel, clientinfo.pub);
    logger.info('signalling done')

    peer = await login(peer)
    logger.info('login done')

    const pty = await startPty(peer)
    logger.info('pty started')

    peer = await session(pty, peer)
    logger.info('session done')

  } catch (e) {
    logger.error(e)
  }
  logger.info("Done with client %s", clientinfo.channel)
}

const signalling = (clientChannel, clientPub) => {
  let timer;
  let signallingTimeout = process.env.DEBUG ? 1000000 : config.get("signallingTimeout")
  let sub = hub.subscribe(clientChannel)

  return new Promise((resolve, reject) => {
    if (!isClientAllowed(clientPub)) {
      hub.broadcast(clientChannel, {
        type: "error",
        message: "Client not allowed"
      });
      reject(new Error("Client not allowed"))
      return
    }

    timer = setTimeout(() => {
      reject("Signalling timeout!")
    }, signallingTimeout)

    sub.on("data", signal => {
      logger.info("signal: %o", signal);

      if (signal.type == "offer") {
        const offer = decrypt(config.get("priv"), clientPub, signal);

        const peer = new SimplePeer({
          initiator: false,
          trickle: false,
          wrtc: wrtc
        });

        peer.on("signal", ans => {
          // send an encrypted answer
          const answer = encrypt(config.get("priv"), clientPub, ans)
          hub.broadcast(clientChannel, answer);
        });

        peer.on("connect", () => {
          resolve(peer)
        });

        peer.on("error", reject);

        peer.signal(offer);
      }
    })

    sub.on('error', reject);

    sub.on('open', () => {
      // send server info
      hub.broadcast(clientChannel, {
        type: "serverinfo",
        pub: config.get("pub")
      });
    })

  }).finally(() => {
    if (timer) clearTimeout(timer)
    sub.destroy()
  })
};

const login = (peer) => {
  peer.removeAllListeners()

  let timer;
  let loginTimeout = process.env.DEBUG ? 1000000 : config.get("loginTimeout")
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject("Signalling timeout!")
    }, loginTimeout)

    let retryCount = config.get("loginRetryCount")
    let ok = false

    peer.on('data', async (raw) => {
      const authdata = JSON.parse(raw)

      try {
        ok = await verifyPass(authdata.password)
      } catch (e) {
        logger.error(e)
      }

      if (ok) {
        peer.send('success')
        resolve(peer)
      } else {
        if (retryCount--) {
          peer.send('retry')
        } else {
          peer.send('failed')
          reject(new Error('Auth failed'))
        }
      }
    })

    peer.on('error', reject)
    peer.on('close', reject)
    peer.send('login')
  }).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

const startPty = (peer) => {
  peer.removeAllListeners()
  return new Promise((resolve, reject) => {
    peer.on('data', (data) => {
      const clientConfig = JSON.parse(data)
      const cwd = clientConfig.cwd ? clientConfig.cwd : os.userInfo().homedir
      try {
        let pty = spawn(os.platform() === "win32" ? "powershell.exe" : os.userInfo().shell, [], {
          name: "icetty",
          cols: clientConfig.cols,
          rows: clientConfig.rows,
          cwd: cwd,
          encoding: "utf8"
        });
        resolve(pty)
      } catch (err) {
        peer.destroy(err);
        reject(err)
      }
    })
    peer.on('error', reject)
    peer.on('close', reject)
  })
}

const session = (pty, peer) => {
  pty.removeAllListeners()
  peer.removeAllListeners()
  return new Promise((resolve, reject) => {
    pty.on("data", data => {
      peer.send(wrap(DATA, data));
    });

    pty.on("exit", () => {
      peer.send(wrap(PTY_EXIT, "exit"));
      peer.destroy();
      resolve()
    });

    peer.on("data", data => {
      const message = unwrap(data)
      if (message.type == RESIZE) {
        pty.resize(message.payload[0], message.payload[1]);
      } else {
        pty.write(message.payload);
      }
    });

    peer.on("error", error => {
      logger.error(error)
      reject(error)
    });

    peer.on("close", () => {
      logger.error("Peer connection closed");
      resolve()
    });
  })
}

const cleanup = async () => {
  config.clear();
}

const addClientPub = (pub) => {
  const clientPubs = config.get("clientPubs", [])
  if (!clientPubs.find(val => val == pub)) {
    clientPubs.push(pub)
  }
  config.set("clientPubs", clientPubs)
}

const removeClientPub = (pub) => {
  const clientPubs = config.get("clientPubs", [])
  clientPubs = clientPubs.filter(val => val != pub)
  config.set("clientPubs", clientPubs)
}

const verifyPass = async (password) => {
  const hash = config.get("pass");
  return argon2.verify(hash, password)
}

const isClientAllowed = (clientPub) => {
  const pubs = config.get("clientPubs", [])
  return pubs.find((val) =>
    val == clientPub)
}

const getId = async () => {
  return config.get("channel");
}

module.exports = {
  setup: setup,
  addClient: addClient,
  getId: getId,
  cleanup: cleanup,
  start: start,
  login: login
};
