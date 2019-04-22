const SimplePeer = require("simple-peer");
const wrtc = require("wrtc");
const clipboardy = require("clipboardy");
var inquirer = require("inquirer");

const peers = [];

const waitForPeer = () => {
  return new Promise((resolve, reject) => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      wrtc: wrtc
    });

    inquirer
      .prompt([
        {
          type: "input",
          name: "offer",
          message: "Paste the other peer's offer:"
        }
      ])
      .then(answers => {
        peer.signal(answers.offer);
      });

    peer.on("signal", function(data) {
      const response = JSON.stringify(data);
      console.log("Response saved to clipboard!");
      console.log(response);
      clipboardy.writeSync(response);
    });

    peer.on("connect", () => {
      resolve(peer);
    });

    peer.on("error", reject);
  });
};

/* eslint no-console: "off" */
module.exports = {
  connect: () => {
    return new Promise((resolve, reject) => {
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        wrtc: wrtc
      });

      peer.on("signal", function(data) {
        const offer = JSON.stringify(data);
        console.log("Offer saved to clipboard!");
        console.log(offer);
        clipboardy.writeSync(offer);

        inquirer
          .prompt([
            {
              type: "input",
              name: "response",
              message: "Paste the other's peer response:"
            }
          ])
          .then(answers => {
            peer.signal(answers.response);
          });
      });

      peer.on("connect", () => {
        resolve(peer);
      });

      peer.on("error", reject);
    });
  },
  start: async peerHandler => {
    const peer = await waitForPeer();
    peers.push(peer);
    peerHandler(peer);
  }
};
