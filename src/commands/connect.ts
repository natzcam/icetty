import { Command, flags } from "@oclif/command";
import firebase from "firebase";
import { createFirebase } from "../lib/firebase";
import { authenticate, Client, newClient, selectClient } from "../lib/service";
import config from "../lib/config";
import keypress from "keypress";
import login from "../lib/auth";
import { FirePeer } from "firepeer";
import wrtc from "wrtc";

export default class Connect extends Command {
  static description = "Connect to a peer terminal";

  static flags = {
    help: flags.help({ char: "h" }),
    id: flags.string({ char: "i", description: "peer id to connect to" })
  };

  static args = [{ name: "id", description: "peer id to connect to" }];

  firePeer?: FirePeer;

  async run() {
    const { args, flags } = this.parse(Connect);
    let id = args.id || flags.id;
    this.debug("args: %o", args);
    this.debug("flags: %o", flags);
    try {
      //initialize firebase
      const firebase = createFirebase();

      //ensure client keys
      let client: Client = config.get("client");
      if (!client) {
        await login(flags);
        client = await newClient();
      }

      this.firePeer = new FirePeer(firebase, {
        spOpts: { wrtc }
      });

      const customToken = await authenticate();
      const cred = await firebase.auth().signInWithCustomToken(customToken);

      const id = await selectClient(cred.user as firebase.User);
      this.connect(id);
    } catch (err) {
      console.error(err);
    }
  }

  async connect(id: string) {
    if (!this.firePeer) {
      return;
    }

    keypress(process.stdin);

    const peer = await this.firePeer.connect(
      this.firePeer.uid as string,
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
