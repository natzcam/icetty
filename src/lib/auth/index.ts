import loginGoogle from "./google";
import loginGoogleDevice from "./google.device";
import email from "./email";
import inquirer from "inquirer";
import debug from "../debug";
import config from "../config";

export default async (flags: any) => {
  if (config.has("email")) {
    return await email();
  }

  const options = await prompt(flags);

  debug("login called with these options: %o", options);

  return loginFirebase(options);
};

const prompt = async (flags: any) => {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "How do you want to login?",
      choices: [
        "Google auth through local web browser",
        "Google auth through any external web browser",
        "Login with email/password"
      ],
      filter: val => {
        switch (val) {
          case "Google auth through local web browser":
            return "gweb";
          case "Google auth through any external web browser":
            return "gdevice";
          case "Login with email/password":
            return "email";
          default:
            throw new Error("Choice not found");
        }
      },
      when: (answers: any) => {
        if (flags.gweb) {
          answers.type = "gweb";
          return false;
        } else if (flags.gdevice) {
          answers.type = "gdevice";
          return false;
        } else if (flags.email) {
          answers.type = "email";
          return false;
        }
        return true;
      }
    }
  ]);
  return answers;
};

const loginFirebase = (options: any) => {
  switch (options.type) {
    case "gweb":
      return loginGoogle();
    case "gdevice":
      return loginGoogleDevice();
    case "email":
      return email();
    default:
      throw new Error("Login type not supported");
  }
};
