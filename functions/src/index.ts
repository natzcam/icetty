import { https } from "firebase-functions";
import admin from "firebase-admin";
import { Crypt } from "hybrid-crypto-js";

const crypt = new Crypt();

admin.initializeApp();

export const newClient = https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new https.HttpsError("unauthenticated", "unauthenticated");
  }

  if (!data.name || !data.pub) {
    throw new https.HttpsError("invalid-argument", "invalid-argument");
  }

  const client: any = {
    name: data.name,
    pub: data.pub
  };

  const ref = await admin
    .firestore()
    .collection(`/users/${context.auth.uid}/clients`)
    .add(client);

  client.id = ref.id;
  client.uid = context.auth.uid;
  return client;
});

export const authenticate = https.onCall(async (data, context) => {
  if (!data.uid || !data.id) {
    throw new https.HttpsError("invalid-argument", "invalid-argument");
  }

  const snapshot = await admin
    .firestore()
    .doc(`/users/${data.uid}/clients/${data.id}`)
    .get();
  if (snapshot && snapshot.exists) {
    const client = snapshot.data();
    if (client && client.pub) {
      const customToken = await admin.auth().createCustomToken(data.uid);
      return crypt.encrypt(client.pub, customToken);
    }
  }

  throw new https.HttpsError("permission-denied", "permission-denied");
});
