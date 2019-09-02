const debug = require("debug")("icetty:host");
const { spawn } = require("node-pty");
const signalhub = require("signalhub");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const argon2 = require("argon2")
const hub = signalhub("icetty", ["https://signalhub-jccqtwhdwc.now.sh"]);
//app
const config = require("./config/host");
const { randomStr, decrypt, encrypt } = require("./utils");

const startPty = (peer) => {
  peer.on('data', (data) => {
    peer.removeAllListeners()
    const clientConfig = JSON.parse(data)
    const env = Object.assign(process.env, clientConfig.env)
    const cwd = clientConfig.cwd ? clientConfig.cwd : config.get("cwd")

    debug("starting pty session!");

    try {
      let pty = spawn(config.get("shell"), [], {
        name: "icetty",
        cols: clientConfig.cols,
        rows: clientConfig.rows,
        cwd: cwd,
        env: env
      });

      pty.on("data", data => {
        peer.send(data);
      });

      pty.on("exit", () => {
        peer.send("icetty:exit");
        peer.destroy();
      });

      peer.on("data", data => {
        if (data.length == 2) {
          pty.resize(data[0], data[1]);
        } else {
          pty.write(data);
        }
      });

      peer.on("error", console.error);

      peer.on("close", () => {
        console.log("Peer connection closed");
        pty.kill();
      });
    } catch (err) {
      console.error(err);
      peer.destroy(err);
    }
  })
}

const login = (peer) => {
  return new Promise((resolve, reject) => {
    peer.on('data', async (raw) => {
      const authdata = JSON.parse(raw)
      debug('authdata', authdata)

      try {
        if (await verify(authdata.username, authdata.password)) {
          peer.send('success')
          peer.removeAllListeners()
          resolve(peer)
        } else {
          peer.send('failed')
          peer.removeAllListeners()
          reject(new Error('auth failed'))
        }
      } catch (e) {
        reject(e)
      }
    })
    peer.on('error', reject)
    peer.send('login')
  })
}

const signalling = (channel, clientPub) => {
  return new Promise((resolve, reject) => {
    const sub = hub.subscribe(channel)
      .on("data", encOffer => {
        if (encOffer.type == "offer") {
          const offer = decrypt(config.get("priv"), clientPub, encOffer);
          debug("offer", offer);

          const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            wrtc: wrtc
          });

          peer.on("signal", answer => {
            // send an encrypted answer
            const encAnswer = encrypt(config.get("priv"), clientPub, answer)
            hub.broadcast(channel, encAnswer);
          });

          peer.on("connect", () => {
            sub.destroy();
            peer.removeAllListeners()
            resolve(peer)
          });

          peer.on("error", (error) => {
            sub.destroy();
            reject(error)
          });

          peer.signal(offer);
        }
      }).on('error', (error) => {
        sub.destroy()
        reject(error)
      });
  })
};

//wait for handshakes
const waitForHandshake = () => {
  hub.subscribe(config.get("channel")).on("data", async (handshake) => {
    debug("handshake", handshake);

    if (!handshake.pub || !handshake.reply) {
      throw new Error("Invalid handshake");
    }

    const signallingChannel = randomStr(32);
    hub.broadcast(handshake.reply, {
      pub: config.get("pub"),
      channel: signallingChannel
    });

    var peer = await signalling(signallingChannel, handshake.pub);
    debug('signalling done')

    peer = await login(peer)
    debug('login done')

    startPty(peer)
  });
}

const start = () => {
  console.log("host started", config.get("channel"));

  waitForHandshake()
};

const register = async (username, password) => {
  const hash = await argon2.hash(password);
  config.set("users." + username, hash)
}

const verify = async (username, password) => {
  if (await argon2.verify(config.get("users." + username), password)) {
    return true
  } else {
    return false
  }
}

module.exports = {
  start: start,
  register: register,
  login: login
};
