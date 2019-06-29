const debug = require("debug")("icetty:host");
const signalhub = require("signalhub");
const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const hub = signalhub("icetty", ["https://signalhub-jccqtwhdwc.now.sh"]);
//app
const config = require("./config/host");
const { randomStr, decrypt, encrypt } = require("./utils");

const auth = (peer, peerHandler) => {
  peerHandler(peer);
  peer.on('data', )
};

const signalling = (sinallingChannel, clientPub, peerHandler) => {
  const sub = hub.subscribe(sinallingChannel).on("data", offer => {
    debug("recv", offer);
    if (offer.type == "offer") {
      offer = decrypt(config.get("priv"), clientPub, offer);
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        wrtc: wrtc
      });

      peer.on("signal", answer => {
        hub.broadcast(
          sinallingChannel,
          encrypt(config.get("priv"), clientPub, answer)
        );
      });

      peer.on("connect", () => {
        sub.destroy();
        auth(peer, peerHandler);
      });

      peer.on("error", console.error);

      debug("offer", offer);
      peer.signal(offer);
    }
  });
};

const start = async peerHandler => {
  console.log("host started", config.get("channel"));

  hub.subscribe(config.get("channel")).on("data", handshake => {
    debug("handshake offer", handshake);
    const signallingChannel = randomStr(32);
    if (handshake.pub && handshake.reply) {
      hub.broadcast(handshake.reply, {
        pub: config.get("pub"),
        channel: signallingChannel
      });
      signalling(signallingChannel, handshake.pub, auth(peerHandler));
    } else {
      throw new Error("Invalid handshake");
    }
  });
};

module.exports = {
  start: start
};
