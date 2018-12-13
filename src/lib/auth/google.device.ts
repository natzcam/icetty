import firebase from "firebase";
import GoogleDeviceAuth from "google-device-auth";
import keys from "./../../keys";

export default (user?: firebase.User) => {
  var deviceAuth = new GoogleDeviceAuth({
    clientId: keys.googleDevice.clientId,
    // really needed: https://developers.google.com/identity/protocols/OAuth2ForDevices
    clientSecret: keys.googleDevice.clientSecret,
    scopes: ["email"]
  });

  return new Promise((resolve, reject) => {
    deviceAuth.on(GoogleDeviceAuth.events.userCode, (data: any) => {
      console.log(
        `Please visit this URL: ${
          data.verification_url
        }, and enter this code: ${data.user_code}`
      );
    });

    deviceAuth.on(GoogleDeviceAuth.events.authSuccess, function(data: any) {
      var credential = firebase.auth.GoogleAuthProvider.credential(
        data.id_token
      );

      const errHandler = (err: any) => {
        if (err.code === "auth/account-exists-with-different-credential") {
          console.error(
            "You have already signed up with a different auth provider for that email."
          );
        }
        reject(err);
      };
      const successHandler = (cred: any) => {
        if (cred.user) {
          console.log(`Hi ${cred.user.email}!`);
        }
        resolve(cred);
      };

      if (user) {
        user
          .linkAndRetrieveDataWithCredential(credential)
          .then(successHandler)
          .catch(errHandler);
      } else {
        firebase
          .auth()
          .signInAndRetrieveDataWithCredential(credential)
          .then(successHandler)
          .catch(errHandler);
      }
    });

    deviceAuth.auth();
  });
};
