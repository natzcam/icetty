const debug = require("debug")("icetty:client");
const keypress = require("keypress");
const tty = require("tty");
const signalhub = require("signalhub");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const hub = signalhub("icetty", ["https://signalhub-jccqtwhdwc.now.sh"]);
//app
const config = require("./config/client");
const { randomStr, decrypt, encrypt } = require("./utils");

const startPty = (peer) => {

  keypress(process.stdin);

  peer.on("error", err => {
    if (err.message == "icetty:pty_exit") {
      console.error("Remote session ended");
    } else {
      console.error(err);
    }
  });

  peer.on("close", () => {
    console.log("Peer connection closed");
    process.exit();
  });

  peer.on("data", data => {
    if (data == "icetty:exit") {
      console.log("PTY exited");
      peer.destroy();
    } else {
      process.stdout.write(data);
    }
  });

  process.stdin.on("keypress", char => {
    peer.send(char);
  });

  process.stdout.on("resize", () => {
    peer.send(Buffer.from([process.stdout.columns, process.stdout.rows]));
  });

  if (typeof process.stdin.setRawMode == "function") {
    process.stdin.setRawMode(true);
  } else {
    tty.setRawMode(true);
  }

  process.stdin.resume();

  debug("starting remote session!");

  peer.send(JSON.stringify({ cols: process.stdout.columns, rows: process.stdout.rows }));
}

const login = (peer, username, password) => {
  return new Promise((resolve, reject) => {
    peer.on('data', (loginResponse) => {
      if (loginResponse == 'login') {
        peer.send(JSON.stringify({ username: username, password: password }))
      } else if (loginResponse == 'success') {
        peer.removeAllListeners()
        resolve(peer);
      } else if (loginResponse == 'failed') {
        peer.removeAllListeners()
        reject(new Error('auth failed'))
      }
    })
    peer.on('error', reject)
  })
}

const signalling = (handshakeReply) => {
  return new Promise((resolve, reject) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      wrtc: wrtc
    });

    var sub;
    peer.on("signal", function (offer) {
      // wait for encrypted answer
      sub = hub.subscribe(handshakeReply.channel)
        .on("data", encAnswer => {
          if (encAnswer.type == "answer") {
            if (sub) sub.destroy()
            const answer = decrypt(config.get("priv"), handshakeReply.pub, encAnswer);
            debug("answer", answer);
            peer.signal(answer);
          }
        }).on('error', (error) => {
          if (sub) sub.destroy()
          reject(error)
        });

      // send an encrypted offer
      const encOffer = encrypt(config.get("priv"), handshakeReply.pub, offer)
      hub.broadcast(handshakeReply.channel, encOffer);
    });

    peer.on("connect", () => {
      peer.removeAllListeners()
      resolve(peer)
    });

    peer.on("error", (error) => {
      if (sub) sub.destroy()
      reject(error)
    });
  })
}

const handshake = host => {
  return new Promise((resolve, reject) => {
    const replyChannel = randomStr(32);
    const sub = hub.subscribe(replyChannel)
      .on("data", handshake => {
        sub.destroy();
        resolve(handshake);
      }).on('error', error => {
        sub.destroy();
        reject(error)
      });
    hub.broadcast(host, {
      pub: config.get("pub"),
      reply: replyChannel
    });
  });
};

const connect = async (host, username, password) => {
  debug("handshake with", host);

  const handshakeReply = await handshake(host);
  debug("handshake reply", handshakeReply);

  var peer = await signalling(handshakeReply);
  debug('signalling done')

  peer = await login(peer, username, password)
  debug('login done')

  startPty(peer)
};

module.exports = {
  connect: connect
};
