import { Command, flags } from "@oclif/command";
import firebase from "firebase";
import Receiver from "../lib/receiver";
import { authenticate } from "../lib/client";
import { initFirebase } from "../lib/firebase";

export default class Start extends Command {
  static description = "describe the command here";

  static flags = {};

  static args = [];

  async run() {
    const { args, flags } = this.parse(Start);

    let receiver: Receiver;
    try {
      initFirebase();
      receiver = new Receiver();
      const customToken = await authenticate();
      firebase.auth().signInWithCustomToken(customToken);
    } catch (err) {
      console.error(err);
    }
  }
}
