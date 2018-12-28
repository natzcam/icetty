import { Command } from "@oclif/command";
import { authenticate, Client, createClient } from "../lib/service";
import { createFirebase } from "../lib/firebase";
import config from "../lib/config";
import debug from "../lib/debug";
import { FirePeer, Signal, FirePeerInstance } from "firepeer";
import { spawn, IPty } from "node-pty";
import wrtc from "wrtc";

export default class Start extends Command {
  static description = "describe the command here";

  static flags = {};

  static args = [];

  processes = {};

  async run() {
    const { flags } = this.parse(Start);

    //initialize firebase
    const firebase = createFirebase();

    //ensure client
    let client: Client = await createClient(flags);

    const firePeer = new FirePeer(firebase, {
      id: client.id,
      spOpts: { wrtc },
      onOffer: (offer: Signal): Signal | null => {
        if (firePeer && firePeer.uid && firePeer.uid == offer.uid) {
          return offer;
        } else {
          return null;
        }
      }
    });

    const watchProcess = (peer: FirePeerInstance, ptyProcess: IPty) => {
      ptyProcess.on("data", data => {
        peer.send(data);
      });

      ptyProcess.on("exit", data => {
        peer.destroy(new Error("Process exited."));
      });

      peer.on("data", (data: any) => {
        ptyProcess.write(data);
      });

      peer.on("error", (err: Error) => {
        console.error(err.message);
        debug(err);
      });

      peer.on("close", () => {
        console.info("Remote peer connection closed.");
        ptyProcess.kill();
      });
    };

    firePeer.on("connection", peer => {
      var ptyProcess;
      try {
        ptyProcess = spawn(config.shell(), [], {
          name: "icetty",
          cols: 80,
          rows: 30,
          cwd: process.env.HOME,
          env: process.env as any
        });
      } catch (err) {
        peer.destroy(err);
      }

      if (ptyProcess) {
        watchProcess(peer, ptyProcess);
      }
    });

    const customToken = await authenticate();
    await firebase.auth().signInWithCustomToken(customToken);

    console.log("client id: ", client.id);
    console.log("client name: ", client.name);
  }
}
