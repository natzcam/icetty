import { EventEmitter } from "events";
import firebase from "firebase";
import { FirePeer } from "firepeer";
import keypress from "keypress";
import wrtc from "wrtc";
import { Client } from "./service";
import inquirer = require("inquirer");

export default class Initiator extends EventEmitter {
  firePeer: FirePeer;

  constructor(client: Client) {
    super();
    this.firePeer = new FirePeer(firebase, { id: client.id, spOpts: { wrtc } });
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
