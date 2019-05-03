const debug = require("debug")("icetty:config-client");
const Conf = require("conf");
const inquirer = require("inquirer");
const utils = require("../utils");
const ora = require("ora");

const client = new Conf({ configName: "client" });
debug(client.store);

client.setup = async () => {
  if (client.has("channel")) {
    return;
  }

  const answers = await inquirer.prompt([]);
  client.set(answers);

  const generateKeys = utils.generateKeys().then(keys => {
    client.set("pub", keys[0]);
    client.set("priv", keys[1]);
  });
  ora.promise(generateKeys, "Generating keys");

  await generateKeys;

  const channel = await utils.randomStr(32);
  client.set("channel", channel);
};

module.exports = client;
