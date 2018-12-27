import firebase from "firebase";
import debug from "./debug";
import keys from "./../keys";

let app: firebase.app.App;
export const createFirebase = () => {
  app = firebase.initializeApp(keys.firebase);
  firebase.firestore().settings({ timestampsInSnapshots: true });
  return app;
};

export const stopFirebase = () => {
  //TODO
  process.exit();
};
