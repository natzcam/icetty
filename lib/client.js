const debug = require("debug")("icetty:client");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const Conf = require("conf");
const ora = require("ora");
const sshpk = require('sshpk');
const isUrl = require("is-url");
const inquirer = require("inquirer");
const signalhub = require("./signalling");

const { randomStr, decrypt, encrypt, wrap, unwrap, generateKeys, startRawMode } = require("./utils");
const { DATA, PTY_EXIT, RESIZE } = require('./constants');

const config = new Conf({
  projectName: "icetty", configName: "client",
  defaults: {
    signallingTimeout: process.env.DEBUG ? 1000000 : 30000,
    loginTimeout: process.env.DEBUG ? 1000000 : 30000
  }
});

//TODO implement ora spinners
//TODO server verification

const setup = async (argv) => {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "signallingImpl",
      message: "Signalling implementation to use",
      default: "signalhubws",
      choices: ["signalhubws", "signalhub", "signalhubfb"],
      when: () => {
        return !config.has("signallingImpl")
      }
    },
    {
      type: "input",
      name: "signallingServer",
      message: "Signalling server to use",
      default: "https://icetty.herokuapp.com",
      when: (answers) => {
        return !config.has("signallingServer")
      },
      validate: (input, answers) => {
        if (isUrl(input)) {
          config.set("signallingServer", input)
          return true
        } else {
          return "Not a valid URL"
        }
      }
    },
    {
      type: "input",
      name: "host",
      message: "Host to connect",
      default: config.get("host"),
      when: (answers) => {
        if (argv.host) {
          answers.host = argv.host
          return false
        } else return true
      },
      validate: (input, answers) => {
        if (input) {
          config.set("host", input);
          return true
        } else return "Host is required"
      }
    }
  ]);
  if (!config.has("signallingImpl")) {
    config.set("signallingImpl", answers.signallingImpl)
  }
}

const start = async () => {
  debug('starting client')

  let spinner;
  if (!config.has("pub") || !config.has("priv")) {
    spinner = ora("Generating host keys").start()
    const keypair = await generateKeys();
    config.set("pub", keypair.publicKey.replace(/\r\n/g, '\n'));
    config.set("priv", keypair.privateKey.replace(/\r\n/g, '\n'));
    spinner.stop()
  }

  hub = signalhub(config.get("signallingImpl"), config.get("signallingServer"));

  const host = config.get("host")
  debug("signalling with", host);
  let peer = await signalling(hub, host);
  debug('signalling done')

  peer = await login(peer)
  debug('login done')

  startRawMode()
  return await session(peer)
};

const signalling = (hub, host) => {
  const channel = randomStr(32);
  const sub = hub.subscribe(channel);
  let timer;
  let peer;
  let serverinfo;

  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject("Signalling timeout!")
    }, config.get("signallingTimeout"))

    //handle signal from server
    sub.on("data", signal => {
      debug("signal: %o", signal)

      if (signal.type == "serverinfo") {
        serverinfo = signal;

        if (peer) {
          reject("Only a single serverinfo message")
          return;
        }

        peer = new SimplePeer({
          initiator: true,
          trickle: false,
          wrtc: wrtc
        });

        peer.on("signal", function (off) {
          // send an encrypted offer
          const offer = encrypt(config.get("priv"), serverinfo.pub, off)
          hub.broadcast(channel, offer);
        });

        peer.on("connect", () => {
          resolve(peer)
        });
        peer.on("error", reject);

      } else if (signal.type == "answer") {
        if (!serverinfo) {
          reject("Server info should be present")
          return;
        }
        // decrypt the answer
        const answer = decrypt(config.get("priv"), serverinfo.pub, signal);
        peer.signal(answer);
      } else if (signal.type == "error") {
        reject(signal.message)
      }
    })

    sub.on('error', reject);

    sub.on('open', () => {
      // send connection request
      hub.broadcast(host, {
        type: "clientinfo",
        pub: config.get("pub"),
        channel: channel
      });
    })
  }).finally(() => {
    if (timer) clearTimeout(timer)
    sub.destroy()
  });
};

const login = (peer) => {
  peer.removeAllListeners()
  let timer;
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject("Login timeout!")
    }, config.get("loginTimeout"))

    peer.on('data', async (loginResponse) => {
      debug("login response: %o", loginResponse)
      if (loginResponse == 'login' || loginResponse == 'retry') {
        const answers = await inquirer.prompt([{
          type: "password",
          name: "password",
          message: "Password?",
          validate: (input) => {
            return input ? true : "Password is required!"
          }
        }]);

        peer.send(JSON.stringify({ password: answers.password }))
      } else if (loginResponse == 'success') {
        resolve(peer);
      } else if (loginResponse == 'failed') {
        peer.destroy(new Error('Auth failed'));
        reject(new Error('Auth failed'))
      }
    })
    peer.on('error', reject)
  }).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

const session = (peer) => {
  peer.removeAllListeners()
  process.stdin.setEncoding("utf8")
  process.stdout.setEncoding("utf8")

  return new Promise((resolve, reject) => {
    console.log('Starting icetty session!')
    let remoteExited = false

    peer.on("error", reject);

    peer.on("close", () => {
      if (remoteExited) {
        resolve(true)
      } else {
        reject(new Error("Peer connection closed"))
      }
    });

    peer.on("data", data => {
      let message = unwrap(data)
      if (message.type == DATA) {
        process.stdout.write(message.payload);
      } else if (message.type == PTY_EXIT) {
        remoteExited = true
        peer.destroy();
      }
    });

    // TODO lag compensation?
    process.stdin.on("keypress", char => {
      peer.send(wrap(DATA, char));
    });

    process.stdout.on("resize", () => {
      peer.send(wrap(RESIZE, Buffer.from([process.stdout.columns, process.stdout.rows])));
    });

    peer.send(JSON.stringify({ cols: process.stdout.columns, rows: process.stdout.rows }));
  })
}

const key = () => {
  const pub = config.get("pub");
  const key = sshpk.parseKey(pub, "pem")
  console.log(key.toString('ssh'))
}

module.exports = {
  setup: setup,
  start: start,
  key: key
};
