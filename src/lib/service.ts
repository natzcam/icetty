import firebase from "firebase";
import { Crypt, RSA } from "hybrid-crypto-js";
import os from "os";
import config from "./config";
import debug from "./debug";
import inquirer = require("inquirer");
const rsa = new RSA();
const crypt = new Crypt();

export interface Client {
  uid: string;
  id: string;
  name: string;
  pub: string;
}

const generateKeys = () => {
  return new Promise((resolve, reject) => {
    //no err handler
    rsa.generateKeypair((keypair: any) => {
      resolve(keypair);
    });
  });
};

export const newClient = async () => {
  const keypair: any = await generateKeys();
  const newClientCall = firebase.functions().httpsCallable("newClient");
  const result = await newClientCall({
    pub: keypair.publicKey,
    name: os.hostname()
  });
  const client: Client = result.data;
  debug("client: %o", client);
  config.set("client", client);
  config.set("priv", keypair.privateKey);
  return result.data;
};

export const authenticate = async () => {
  const client = config.get("client");
  const authenticate = firebase.functions().httpsCallable("authenticate");
  const result = await authenticate({
    uid: client.uid,
    id: client.id
  });

  const decrypted = crypt.decrypt(config.get("priv"), result.data);
  return decrypted.message;
};

export const getClients = async (user: firebase.User) => {
  if (user) {
    const clients: string[] = [];
    const snapshot = await firebase
      .firestore()
      .collection(`/users/${user.uid}/clients`)
      .get();
    snapshot.forEach(docSnapshot => {
      clients.push(docSnapshot.id);
    });
    return clients;
  } else {
    throw new Error("not logged in");
  }
};

export const selectClient = async (user: firebase.User) => {
  let answers: any;
  const clients = await getClients(user);
  debug("clients: %s", clients.length);
  if (clients.length) {
    answers = await inquirer.prompt([
      {
        name: "id",
        type: "list",
        message: "Client id to connect:",
        choices: clients
      }
    ]);
  } else {
    answers = await inquirer.prompt([
      {
        name: "id",
        type: "input",
        message: "Client id to connect:"
      }
    ]);
  }
  return answers.id;
};
