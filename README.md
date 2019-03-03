## Amplify Mobilehub Migrator
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
```
npm i -g @aws-amplify-console/amplify-mobilehub-migrator
```

### Installing Manually
1. Clone this repo onto your local machine
2. Open the terminal and navigate to the repo you just cloned
3. Run this command:

```
npm install -g
```

## Usage
1. Create a new directory
```
mkdir amplify-project && cd amplify-project
```
2. Walk through initializing the amplify project
```
amplify init
```
3. Import your mobile hub resources
```
amplify mobilehub import <projectId>    
```

## Notes

- In order to preseve production data in existing mobile hub resources, the migrator plugin cannot be used with the multiple environments feature in Amplify.

## License

This library is licensed under the Apache 2.0 License.
