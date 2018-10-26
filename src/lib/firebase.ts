import firebase from "firebase";
import debug from "./debug";
import keys from "./../keys";

let app: firebase.app.App;
export const initFirebase = () => {
  app = firebase.initializeApp(keys.firebase);
  firebase.firestore().settings({ timestampsInSnapshots: true });
  return app;
};

export const stopFirebase = () => {
  // if (app) {
  //   app.delete()
  //     .then(function () {
  //       console.log("App deleted successfully");
  //       process.exit();
  //     })
  // }
  process.exit();
};
