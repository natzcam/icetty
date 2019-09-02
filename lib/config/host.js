const debug = require("debug")("icetty:config-host");
const Conf = require("conf");
const inquirer = require("inquirer");
const os = require("os");
const utils = require("../utils");
const ora = require("ora");

const host = new Conf({ projectName: "icetty", configName: "host" });

host.setup = async reset => {
  if (host.has("channel") && !reset) {
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "shell",
      message: "Shell to be used by authorized peers",
      default: os.platform() === "win32" ? "powershell.exe" : "bash"
    },
    {
      type: "input",
      name: "cwd",
      message: "Initial working directory",
      default: process.env.HOME
    }
  ]);
  host.set(answers);

  const generateKeys = utils.generateKeys().then(keys => {
    host.set("pub", keys[0]);
    host.set("priv", keys[1]);
  });
  ora.promise(generateKeys, "Generating keys");

  await generateKeys;

  const channel = await utils.randomStr(32);
  host.set("channel", channel);
};

module.exports = host;
