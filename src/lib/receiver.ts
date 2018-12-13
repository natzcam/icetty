import { EventEmitter } from "events";
import firebase from "firebase";
import { FirePeer, Signal } from "firepeer";
import notifier from "node-notifier";
import { spawn } from "node-pty";
import wrtc from "wrtc";
import config from "./config";
import { Client } from "./service";

export default class Receiver extends EventEmitter {
  firePeer: FirePeer;
  watch = false;

  constructor(client: Client) {
    super();

    this.firePeer = new FirePeer(firebase, {
      id: client.id,
      spOpts: { wrtc },
      allowOffer: this.allowOffer
    });

    this.firePeer.on("connection", peer => {
      var ptyProcess = spawn(config.shell(), [], {
        name: "icetty",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env as any
      });

      ptyProcess.on("data", data => {
        peer.send(data);
        if (this.watch) {
          process.stdout.write(data);
        }
      });

      peer.on("data", (data: any) => {
        ptyProcess.write(data);
      });
    });
  }

  allowOffer(offer: Signal): Promise<boolean> {
    return new Promise((resolve, reject) => {
      notifier.notify({
        title: `IceTTY: user ${offer.uid} would like to connect`,
        message: "Click to allow, ignore to disallow.",
        sound: true,
        wait: true
      });

      notifier.on("click", function(notifierObject, options) {
        resolve(true);
      });
      notifier.on("timeout", function(notifierObject, options) {
        reject(false);
      });
    });
  }
}
