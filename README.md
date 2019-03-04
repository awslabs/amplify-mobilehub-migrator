# Amplify Mobilehub Migrator

A plugin to migrate existing Mobile Hub projects to be used with the Amplify CLI

- [Amplify Mobilehub Migrator](#amplify-mobilehub-migrator)
  - [Installation Guide](#installation-guide)
    - [Installing via NPM (Recommended)](#installing-via-npm-recommended)
    - [Installing Manually](#installing-manually)
  - [Usage](#usage)
  - [Notes](#notes)
  - [License](#license)

## Installation Guide

To get started, make sure you've installed the Amplify CLI.
Please refer to the getting started guide on [GitHub](https://github.com/aws-amplify/amplify-cli).

After installing the official CLI you now have to install this plugin on your local machine. There are two ways to do this.

### Installing via NPM (Recommended)

```bash
npm i -g amplify-mobilehub-migrator
```

### Installing Manually

1. Clone this repo onto your local machine
2. Open the terminal and navigate to the repo you just cloned
3. Run this command:

```bash
npm install -g
```

## Usage

1. **Create a new directory or use existing project directory.**

```bash
mkdir amplify-project && cd amplify-project
```

2. **Walk through initializing the amplify project**

``` bash
amplify init
```

3. **Import your mobile hub resources**

``` bash
amplify mobilehub import <projectId>
```

The mobile hub project Id can be retrieved from the url when you navigate to a project in the aws mobile hub console.

eg. `https://console.aws.amazon.com/mobilehub/home?#/af12bd20-3fbb-1234-bcc3-86fd1a57cb93/build`
> project Id : af12bd20-3fbb-1234-bcc3-86fd1a57cb93

## Notes

- In order to preseve production data in existing mobile hub resources, the migrator plugin cannot be used with the multiple environments feature in Amplify.

## License

This library is licensed under the Apache 2.0 License.
