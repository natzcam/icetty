icetty
======

secure p2p command line access to any of your devices

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/icetty.svg)](https://npmjs.org/package/icetty)
[![Downloads/week](https://img.shields.io/npm/dw/icetty.svg)](https://npmjs.org/package/icetty)
[![License](https://img.shields.io/npm/l/icetty.svg)](https://github.com/natzcam/icetty/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g icetty
$ icetty COMMAND
running command...
$ icetty (-v|--version|version)
icetty/0.0.2 win32-x64 node-v8.12.0
$ icetty --help [COMMAND]
USAGE
  $ icetty COMMAND
...
```
<!-- usagestop -->
```sh-session
$ npm install -g icetty
$ icetty COMMAND
running command...
$ icetty (-v|--version|version)
icetty/0.0.1 win32-x64 node-v8.12.0
$ icetty --help [COMMAND]
USAGE
  $ icetty COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`icetty conf [KEY] [VALUE]`](#icetty-conf-key-value)
* [`icetty connect [ID]`](#icetty-connect-id)
* [`icetty help [COMMAND]`](#icetty-help-command)
* [`icetty login`](#icetty-login)
* [`icetty start`](#icetty-start)

## `icetty conf [KEY] [VALUE]`

manage configuration

```
USAGE
  $ icetty conf [KEY] [VALUE]

ARGUMENTS
  KEY    key of the config
  VALUE  value of the config

OPTIONS
  -d, --cwd=cwd          config file location
  -d, --delete           delete?
  -h, --help             show CLI help
  -k, --key=key          key of the config
  -n, --name=name        config file name
  -p, --project=project  project name
  -v, --value=value      value of the config
```

_See code: [conf-cli](https://github.com/natzcam/conf-cli/blob/v0.1.6/src\commands\conf.ts)_

## `icetty connect [ID]`

Connect to a peer terminal

```
USAGE
  $ icetty connect [ID]

ARGUMENTS
  ID  peer id to connect to

OPTIONS
  -h, --help   show CLI help
  -i, --id=id  peer id to connect to
```

_See code: [src\commands\connect.ts](https://github.com/natzcam/icetty/blob/v0.0.2/src\commands\connect.ts)_

## `icetty help [COMMAND]`

display help for icetty

```
USAGE
  $ icetty help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.3/src\commands\help.ts)_

## `icetty login`

describe the command here

```
USAGE
  $ icetty login

OPTIONS
  -h, --help  show CLI help
```

_See code: [src\commands\login.ts](https://github.com/natzcam/icetty/blob/v0.0.2/src\commands\login.ts)_

## `icetty start`

describe the command here

```
USAGE
  $ icetty start
```

_See code: [src\commands\start.ts](https://github.com/natzcam/icetty/blob/v0.0.2/src\commands\start.ts)_
<!-- commandsstop -->
* [`icetty conf [KEY] [VALUE]`](#icetty-conf-key-value)
* [`icetty connect [ID]`](#icetty-connect-id)
* [`icetty help [COMMAND]`](#icetty-help-command)
* [`icetty login`](#icetty-login)
* [`icetty start`](#icetty-start)

## `icetty conf [KEY] [VALUE]`

manage configuration

```
USAGE
  $ icetty conf [KEY] [VALUE]

ARGUMENTS
  KEY    key of the config
  VALUE  value of the config

OPTIONS
  -d, --cwd=cwd          config file location
  -d, --delete           delete?
  -h, --help             show CLI help
  -k, --key=key          key of the config
  -n, --name=name        config file name
  -p, --project=project  project name
  -v, --value=value      value of the config
```

_See code: [conf-cli](https://github.com/natzcam/conf-cli/blob/v0.1.6/src\commands\conf.ts)_

## `icetty connect [ID]`

Connect to a peer terminal

```
USAGE
  $ icetty connect [ID]

ARGUMENTS
  ID  peer id to connect to

OPTIONS
  -h, --help   show CLI help
  -i, --id=id  peer id to connect to
```

_See code: [src\commands\connect.ts](https://github.com/natzcam/icetty/blob/v0.0.1/src\commands\connect.ts)_

## `icetty help [COMMAND]`

display help for icetty

```
USAGE
  $ icetty help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.3/src\commands\help.ts)_

## `icetty login`

describe the command here

```
USAGE
  $ icetty login

OPTIONS
  -h, --help  show CLI help
```

_See code: [src\commands\login.ts](https://github.com/natzcam/icetty/blob/v0.0.1/src\commands\login.ts)_

## `icetty start`

describe the command here

```
USAGE
  $ icetty start
```

_See code: [src\commands\start.ts](https://github.com/natzcam/icetty/blob/v0.0.1/src\commands\start.ts)_
<!-- commandsstop -->
