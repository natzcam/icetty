import { FirePeer } from "firepeer";
import keypress from "keypress";
import firebase from "firebase";
import debug from "../debug";
import wrtc from "wrtc";
import { EventEmitter } from "events";

export default class Initiator extends EventEmitter {
  firePeer: FirePeer;

  constructor() {
    super();
    this.firePeer = new FirePeer(firebase, { spOpts: { wrtc } });
  }

  async connect(user: firebase.User, id: string) {
    keypress(process.stdin);

    const peer = await this.firePeer.connect(
      user.uid,
      id
    );

    peer.on("data", (data: any) => {
      process.stdout.write(data);
    });

    process.stdin.on("keypress", (char, key) => {
      if (key && key.ctrl && key.name == "c") {
        process.exit(0);
      } else {
        peer.send(char);
      }
    });

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
  }
}
