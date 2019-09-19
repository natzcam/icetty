const crypto = require("crypto");
const { RSA, Crypt } = require("hybrid-crypto-js");
const keypress = require("keypress");
const tty = require("tty");
const rsa = new RSA();
const crypt = new Crypt();

const randomStr = length => {
  return crypto.randomBytes(length).toString("hex");
};

const generateKeys = () => {
  return new Promise(resolve => {
    rsa.generateKeyPair(resolve, 4096);
  });
};

const encrypt = (senderPriv, receiverPub, signal) => {
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

const decrypt = (receiverPriv, senderPub, signal) => {
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

const wrap = (messageType, message) => {
  if (Buffer.isBuffer(message)) {
    return Buffer.concat([Buffer.from([messageType]), message])
  } else {
    return Buffer.concat([Buffer.from([messageType]), Buffer.from(message, 'utf8')])
  }
};

const unwrap = (buffer) => {
  return { type: buffer[0], payload: buffer.slice(1) }
};

const startRawMode = () => {

  keypress(process.stdin);

  if (typeof process.stdin.setRawMode == "function") {
    process.stdin.setRawMode(true);
  } else {
    tty.setRawMode(true);
  }

  process.stdin.resume();
}

const disableRawMode = () => {
  if (typeof process.stdin.setRawMode == "function") {
    process.stdin.setRawMode(false);
  } else {
    tty.setRawMode(false);
  }

  process.stdin.pause();
}

module.exports = {
  randomStr: randomStr,
  generateKeys: generateKeys,
  encrypt: encrypt,
  decrypt: decrypt,
  wrap: wrap,
  unwrap: unwrap,
  startRawMode: startRawMode,
  disableRawMode: disableRawMode
}