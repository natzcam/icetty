const crypto = require("crypto");
const { RSA, Crypt } = require("hybrid-crypto-js");
const rsa = new RSA();
const crypt = new Crypt();

module.exports.randomStr = length => {
  return crypto.randomBytes(length).toString("hex");
};

module.exports.generateKeys = () => {
  return new Promise(resolve => {
    rsa.generateKeypair(keypair => {
      var publicKey = keypair.publicKey;
      var privateKey = keypair.privateKey;
      resolve([publicKey, privateKey]);
    });
  });
};

module.exports.encrypt = (senderPriv, receiverPub, signal) => {
  if (!senderPriv) {
    throw new Error("Sender priv is required");
  }
  if (!receiverPub) {
    throw new Error("Receiver pub is required");
  }
  if (typeof signal.type !== "string" || typeof signal.sdp !== "string") {
    throw new Error("Invalid signal");
  }

  const signature = crypt.signature(senderPriv, signal.sdp);
  const sdp = crypt.encrypt(receiverPub, signal.sdp, signature);
  return { type: signal.type, sdp: sdp };
};

module.exports.decrypt = (receiverPriv, senderPub, signal) => {
  if (!receiverPriv) {
    throw new Error("Receiver priv is required");
  }
  if (!senderPub) {
    throw new Error("Sender pub is required");
  }
  if (typeof signal.type !== "string" || typeof signal.sdp !== "string") {
    throw new Error("Invalid signal");
  }

  const decrypted = crypt.decrypt(receiverPriv, signal.sdp);
  const verified = crypt.verify(
    senderPub,
    decrypted.signature,
    decrypted.message
  );
  if (verified) {
    return { type: signal.type, sdp: decrypted.message };
  } else {
    throw new Error("Invalid message signature");
  }
};
