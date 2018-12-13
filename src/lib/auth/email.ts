import inquirer from 'inquirer';
import config from '../config';
import firebase from 'firebase';

export default async () => {

  let cred;
  let answers: any;
  const savedEmail = config.get('email');
  const savedPassword = config.get('password');

  try {
    if (savedEmail) {
      cred = await firebase.auth().signInWithEmailAndPassword(savedEmail, savedPassword);
    } else {
      answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: "Email:",
          validate: (input: string) => {
            if (input && input.length) {
              return true;
            } else {
              return 'Email required'
            }
          },
          filter: (val: string) => {
            return val.toLowerCase();
          }
        },
        {
          type: 'password',
          name: 'password',
          message: "Password:",
          validate: (input) => {
            if (input && input.length) {
              return true;
            } else {
              return 'Password required'
            }
          }
        }
      ]);
      cred = await firebase.auth().signInWithEmailAndPassword(answers.email, answers.password);
      if (cred.user) {
        let saveCredAnswer: any = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'saveCred',
            message: "Save credentials on this device? (Somewhat unsafe)",
            validate: (input) => {
              if (input && input.length) {
                return true;
              } else {
                return 'Email required'
              }
            },
            filter: (val) => {
              return val.toLowerCase();
            }
          }
        ]);
        if (saveCredAnswer.saveCred) {
          config.set('email', answers.email);
          config.set('password', answers.password);
        }
      }
    }

    if (cred.user && !cred.user.emailVerified) {
      console.log("Your email has not been confirmed yet. Check your email and follow our confirmation link.");
      //exit cli
      process.exit();
    }
    return cred;
  } catch (err) {
    if (err.code == 'auth/user-not-found') {
      console.log('Account not found, signing up!');
      return signup(answers);
    }
    throw err;
  }
}

async function signup(initialAnswers: any) {
  await inquirer.prompt([
    {
      type: 'password',
      name: 'confirm',
      message: "Confirm Password:",
      validate: (input, answers) => {
        if (input && input.length) {
          if (initialAnswers.password == input) {
            return true;
          } else {
            return 'Password confirmation is not the same as the password'
          }
        } else {
          return 'Password confirmation required'
        }
      }
    }
  ]);

  const cred = await firebase.auth().createUserWithEmailAndPassword(initialAnswers.email, initialAnswers.password);
  if (cred.user && !cred.user.emailVerified) {
    await cred.user.sendEmailVerification();
    console.log("Confirmation email has been sent!");
    //exit cli
    process.exit();
  }
  return cred;
}
