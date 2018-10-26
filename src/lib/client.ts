import firebase from 'firebase';
import os from 'os';
import config from './config';
import debug from './debug';
import { RSA, Crypt } from 'hybrid-crypto-js';
const rsa = new RSA();
const crypt = new Crypt();

export interface Client {
  uid: string,
  id: string,
  name: string,
  pub: string
}

const generateKeys = () => {
  return new Promise((resolve, reject) => {
    //no err handler
    rsa.generateKeypair((keypair: any) => {
      resolve(keypair);
    });
  });
}

export const newClient = async () => {
  const keypair: any = await generateKeys();
  const newClientCall = firebase.functions().httpsCallable('newClient');
  const result = await newClientCall({
    pub: keypair.publicKey,
    name: os.hostname()
  });
  const client: Client = result.data;
  debug('client: %o', client);
  config.set('client', client);
  config.set('priv', keypair.privateKey);
  return result.data;
}

export const authenticate = async () => {
  const client = config.get('client');
  const authenticate = firebase.functions().httpsCallable('authenticate');
  const result = await authenticate({
    uid: client.uid,
    id: client.id
  });

  const decrypted = crypt.decrypt(config.get('priv'), result.data);
  return decrypted.message;
}
