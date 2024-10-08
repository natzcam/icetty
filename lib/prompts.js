const inquirer = require("inquirer");
const isUrl = require("is-url");

const askConnectionDetails = (argv, config) => {
  return inquirer.prompt([
    {
      type: "input",
      name: "signallingServer",
      message: "Signalling server to use",
      default: "http://localhost:8080",
      when: (answers) => {
        return !config.has("signallingServer");
      },
      validate: (input, answers) => {
        if (isUrl(input)) {
          config.set("signallingServer", input);
          return true;
        } else {
          return "Not a valid URL";
        }
      },
    },
    {
      type: "input",
      name: "host",
      message: "Host ID (on the host, `icettyd --id`)",
      default: config.get("host"),
      when: (answers) => {
        if (argv.host) {
          answers.host = argv.host;
          return false;
        } else return true;
      },
      validate: (input, answers) => {
        if (input) {
          config.set("host", input);
          return true;
        } else return "Host is required";
      },
    },
  ]);
};

const askLogin = () => {
  return inquirer.prompt([
    {
      type: "password",
      name: "password",
      message: "Password?",
      validate: (input) => {
        return input ? true : "Password is required!";
      },
    },
  ]);
};

module.exports = {
  askConnectionDetails,
  askLogin,
};
