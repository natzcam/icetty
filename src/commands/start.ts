import { Command, flags } from "@oclif/command";
import firebase from "firebase";
import Receiver from "../lib/receiver";
import { authenticate, Client, newClient } from "../lib/client";
import { initFirebase } from "../lib/firebase";
import login from "../lib/login";
import config from "../lib/config";

export default class Start extends Command {
  static description = "describe the command here";

  static flags = {};

  static args = [];

  async run() {
    const { args, flags } = this.parse(Start);

    let receiver: Receiver;
    try {
      initFirebase();
      let client: Client = config.get("client");
      if (!client) {
        await login(flags);
        client = await newClient();
      }

      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          receiver = new Receiver(client);
        } else {
          //receiver.destroy();
        }
      });
      const customToken = await authenticate();
      firebase.auth().signInWithCustomToken(customToken);

      console.log("client id: ", client.id);
      console.log("client name: ", client.name);
    } catch (err) {
      console.error(err);
    }
  }
}
