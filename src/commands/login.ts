import { Command, flags } from '@oclif/command'
import login from '../lib/login';
import { stopFirebase, initFirebase } from '../lib/firebase';
import { newClient, Client } from '../lib/client';
import config from '../lib/config';

export default class Login extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({ char: 'h' })
  }

  async run() {
    const { flags } = this.parse(Login)
    try {
      let client: Client = config.get('client');
      if (!client) {

        initFirebase();
        await login(flags);
        client = await newClient();
      }
      console.log('client id: ', client.id);
      console.log('client name: ', client.name);

      stopFirebase();
    } catch (err) {
      console.error(err);
    }
  }
}
