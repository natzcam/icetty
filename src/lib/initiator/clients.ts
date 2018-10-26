import inquirer from 'inquirer';
import firebase from 'firebase';
import { Client } from '../client';
import debug from '../debug';

export default async (user: firebase.User) => {
  let answers: any;
  const clients = await getClients(user);
  debug('clients: %s', clients.length)
  if (clients.length) {
    answers = await inquirer.prompt([
      {
        name: 'id',
        type: 'list',
        message: "Client id to connect:",
        choices: clients
      }
    ]);
  } else {
    answers = await inquirer.prompt([
      {
        name: 'id',
        type: 'input',
        message: "Client id to connect:"
      }
    ]);
  }
  return answers.id;
}

export const getClients = async (user: firebase.User) => {
  if (user) {
    const clients: string[] = [];
    const snapshot = await firebase.firestore().collection(`/users/${user.uid}/clients`).get()
    snapshot.forEach((docSnapshot) => {
      clients.push(docSnapshot.id);
    })
    return clients;
  } else {
    throw new Error('not logged in');
  }
}


