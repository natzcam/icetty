import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

export default {
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID
  },
  googleDevice: {
    clientId: process.env.GOOGLE_DEVICE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DEVICE_CLIENT_SECRET
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID
  }
};
