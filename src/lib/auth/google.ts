import { OAuth2Client } from "google-auth-library";
import http from "http";
import url from "url";
import querystring from "querystring";
import opn from "opn";
import firebase from "firebase";
import keys from "./../../keys";

export default async (user?: firebase.User) => {
  const oAuth2Client = new OAuth2Client({
    clientId: keys.google.clientId,
    redirectUri: `http://localhost:54321/oauth2callback`
  });

  return new Promise((resolve, reject) => {
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: "email"
    });

    const server = http
      .createServer((req, res) => {
        if (req.url && req.url.indexOf("/oauth2callback") > -1) {
          const qs = querystring.parse(url.parse(req.url).query || "");

          oAuth2Client
            .getToken(qs.code as string)
            .then(cred => {
              var credential = firebase.auth.GoogleAuthProvider.credential(
                cred.tokens.id_token
              );

              const errHandler = (err: any) => {
                if (
                  err.code === "auth/account-exists-with-different-credential"
                ) {
                  console.error(
                    "You have already signed up with a different auth provider for that email."
                  );
                }
                reject(err);
              };
              const successHandler = (cred: any) => {
                if (cred.user) {
                  res.end(
                    `Hi ${cred.user.email}! Please return to the console.`
                  );
                  console.log(`Hi ${cred.user.email}!`);
                }
                server.close();
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
            })
            .catch(err => {
              reject(err);
            });
        }
      })
      .listen(54321, () => {
        opn(authorizeUrl);
      });
  });
};
