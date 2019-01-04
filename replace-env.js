const dotenv = require("dotenv");
dotenv.config();
const replace = require("replace-in-file");
const options = {
  files: "lib/keys.js",
  from: [
    /FIREBASE_API_KEY/g,
    /FIREBASE_AUTH_DOMAIN/g,
    /FIREBASE_DATABASE_URL/g,
    /FIREBASE_PROJECT_ID/g,
    /GOOGLE_DEVICE_CLIENT_ID/g,
    /GOOGLE_DEVICE_CLIENT_SECRET/g,
    /GOOGLE_CLIENT_ID/g
  ],
  to: [
    process.env.FIREBASE_API_KEY,
    process.env.FIREBASE_AUTH_DOMAIN,
    process.env.FIREBASE_DATABASE_URL,
    process.env.FIREBASE_PROJECT_ID,
    process.env.GOOGLE_DEVICE_CLIENT_ID,
    process.env.GOOGLE_DEVICE_CLIENT_SECRET,
    process.env.GOOGLE_CLIENT_ID
  ]
};

try {
  const changes = replace.sync(options);
  console.log("Modified files:", changes.join(", "));
} catch (error) {
  console.error("Error occurred:", error);
}
