import { Command, flags } from "@oclif/command";
import Initiator from "../lib/initiator";
import firebase from "firebase";
import { initFirebase } from "../lib/firebase";
import { authenticate, Client, newClient, selectClient } from "../lib/service";
import config from "../lib/config";
import login from "../lib/auth";

export default class Connect extends Command {
  static description = "Connect to a peer terminal";

  static flags = {
    help: flags.help({ char: "h" }),
    id: flags.string({ char: "i", description: "peer id to connect to" })
  };

  static args = [{ name: "id", description: "peer id to connect to" }];

  async run() {
    const { args, flags } = this.parse(Connect);
    let id = args.id || flags.id;
    this.debug("args: %o", args);
    this.debug("flags: %o", flags);

    let initiator: Initiator;
    try {
      initFirebase();
      let client: Client = config.get("client");
      if (!client) {
        await login(flags);
        client = await newClient();
      }

      firebase.auth().onAuthStateChanged(async user => {
        if (user) {
          const id = await selectClient(user);
          initiator = new Initiator(client);
          await initiator.connect(
            user,
            id
          );
        } else {
          //initiator.destroy();
        }
      });

      const customToken = await authenticate();
      firebase.auth().signInWithCustomToken(customToken);
    } catch (err) {
      console.error(err);
    }
  }
}
