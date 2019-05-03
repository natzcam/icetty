const debug = require("debug")("icetty:client");
const signalhub = require("signalhub");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const hub = signalhub("icetty", ["https://signalhub-jccqtwhdwc.now.sh"]);
//app
const config = require("./config/client");
const { randomStr, decrypt, encrypt } = require("./utils");

const handshake = host => {
  debug("handshake", host);
  return new Promise(resolve => {
    const reply = randomStr(32);
    const sub = hub.subscribe(reply).on("data", handshake => {
      sub.destroy();
      resolve(handshake);
    });
    hub.broadcast(host, {
      pub: config.get("pub"),
      reply: reply
    });
  });
};

const connect = async host => {
  const handshakeAnswer = await handshake(host);
  debug("handshake answer", handshakeAnswer);

  return new Promise((resolve, reject) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      wrtc: wrtc
    });

    let sub;
    peer.on("signal", function(offer) {
      sub = hub.subscribe(handshakeAnswer.channel).on("data", answer => {
        debug("recv", answer);
        if (answer.type == "answer") {
          answer = decrypt(config.get("priv"), handshakeAnswer.pub, answer);
          debug("answer", answer);
          peer.signal(answer);
        }
      });
      hub.broadcast(
        handshakeAnswer.channel,
        encrypt(config.get("priv"), handshakeAnswer.pub, offer)
      );
    });

    peer.on("connect", () => {
      if (sub) {
        sub.destroy();
      }
      resolve(peer);
    });

    peer.on("error", reject);
  });
};

module.exports = {
  connect: connect
};
