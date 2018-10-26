import { EventEmitter } from "events";
import { FirePeer } from "firepeer";
import firebase from "firebase";
import { spawn } from "node-pty";
import wrtc from "wrtc";
import config from "../config";
import debug from "../debug";
import notifier from "node-notifier";

export default class Receiver extends EventEmitter {
  firePeer: FirePeer;
  watch = false;

  constructor() {
    super();
    const client = config.get("client");
    console.log("starting %o", client.id);

    this.firePeer = new FirePeer(firebase, {
      id: client.id,
      spOpts: { wrtc }
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
}
