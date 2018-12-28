import { Command, flags } from "@oclif/command";
import firebase from "firebase";
import { createFirebase } from "../lib/firebase";
import { authenticate, selectClient, createClient } from "../lib/service";
import keypress from "keypress";
import { FirePeer } from "firepeer";
import wrtc from "wrtc";

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
    //initialize firebase
    const firebase = createFirebase();

    //ensure client
    await createClient(flags);

    const firePeer = new FirePeer(firebase, {
      spOpts: { wrtc }
    });

    const customToken = await authenticate();
    const cred = await firebase.auth().signInWithCustomToken(customToken);

    if (!id) {
      id = await selectClient(cred.user as firebase.User);
    }
    await this.connect(
      firePeer,
      id
    );
  }

  async connect(firePeer: FirePeer, id: string) {
    keypress(process.stdin);

    const peer = await firePeer.connect(
      firePeer.uid as string,
      id
    );

    peer.on("error", (err: Error) => {
      console.error(err.message);
    });

    peer.on("close", () => {
      console.info("Remote peer connection closed.");
      process.exit();
    });

    peer.on("data", data => {
      process.stdout.write(data);
    });

    process.stdin.on("keypress", (char, key) => {
      peer.send(char);
    });

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
  }
}
