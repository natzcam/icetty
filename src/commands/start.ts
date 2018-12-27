import { Command, flags } from "@oclif/command";
import firebase from "firebase";
import { authenticate, Client, newClient } from "../lib/service";
import { createFirebase } from "../lib/firebase";
import login from "../lib/auth";
import config from "../lib/config";
import { FirePeer, Signal } from "firepeer";
import { spawn } from "node-pty";
import wrtc from "wrtc";

export default class Start extends Command {
  static description = "describe the command here";

  static flags = {};

  static args = [];

  firePeer?: FirePeer;

  async run() {
    const { flags } = this.parse(Start);

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
        id: client.id,
        spOpts: { wrtc },
        onOffer: this.onOffer
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
        });

        peer.on("data", (data: any) => {
          ptyProcess.write(data);
        });
      });

      const customToken = await authenticate();
      await firebase.auth().signInWithCustomToken(customToken);

      console.log("client id: ", client.id);
      console.log("client name: ", client.name);
    } catch (err) {
      console.error(err);
    }
  }

  onOffer = (offer: Signal): Signal | null => {
    if (this.firePeer && this.firePeer.uid && this.firePeer.uid == offer.uid) {
      return offer;
    } else {
      return null;
    }
  };
}
