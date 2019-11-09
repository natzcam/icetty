const debug = require("debug")("icetty:client");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const Conf = require("conf");
const ora = require("ora");
const sshpk = require('sshpk');
const isUrl = require("is-url");
const inquirer = require("inquirer");
const signalhub = require("signalhubws");

const { randomStr, decrypt, encrypt, wrap, unwrap, generateKeys, startRawMode } = require("./utils");
const { DATA, PTY_EXIT, RESIZE } = require('./constants');

const config = new Conf({
  projectName: "icetty", configName: "client",
  defaults: {
    signallingTimeout: 30000,
    loginTimeout: 30000
  }
});

//TODO server verification
//TODO compression
//TODO client config encryption
//TODO icetty --key asks for host

const setup = async (argv) => {

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
}

const start = async () => {
  debug('starting client')

  hub = signalhub("icetty", [config.get("signallingServer")], require('ws'));
  debug("signalling server: " + config.get("signallingServer"))

  const host = config.get("host")
  const spinner = ora("Signalling...").start()
  debug("signalling with", host);
  const peer = await signalling(hub, host);
  debug('signalling done')
  spinner.stop()

  peer = await login(peer)
  debug('login done')

  startRawMode()
  return await session(peer)
};

const signalling = (hub, host) => {
  const channel = randomStr(32);
  const sub = hub.subscribe(channel);
  let timer;
  let signallingTimeout = process.env.DEBUG ? 1000000 : config.get("signallingTimeout")
  let peer;
  let serverinfo;
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject("Signalling timeout!")
    }, signallingTimeout)

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
  let loginTimeout = process.env.DEBUG ? 1000000 : config.get("loginTimeout")
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      reject("Login timeout!")
    }, loginTimeout)

    peer.on('data', async (loginResponse) => {
      debug("login response: %o", loginResponse)
      if (loginResponse == 'login' || loginResponse == 'retry') {
        if (loginResponse == 'retry') {
          console.log('Auth failed!')
        }
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
