# AWS Mobile Hub &rarr; Amplify CLI Migrator

A plugin to migrate existing AWS Mobile Hub projects to be used with the Amplify CLI. This plugin is officially supported by the AWS Mobile team. With this plugin, you will be able to:
1. Re-use resources created by Mobile Hub in the Amplify CLI (compatible with Amplify CLI `version > 4.29.2`)
2. Leverage Amplify CLI functionality such as GraphQL APIs (provisioned by AWS AppSync), [GraphQL transform](https://aws-amplify.github.io/docs/cli/graphql), and the [Codegen](https://aws-amplify.github.io/docs/cli/codegen) functionality.

You will not be able to:

1. Use the CLI's [multi-environment](https://aws-amplify.github.io/docs/cli/multienv) feature with migrated Mobile Hub projects.
2. Import Mobile Hub projects into existing Amplify projects that are already using the multi-env feature.

- [Installation Guide](#installation-guide)
- [Usage](#usage)
- [Notes](#notes)
- [License](#license)

## Installation Guide

To get started, make sure you've installed the Amplify CLI. Please refer to the getting started guide on [GitHub](https://github.com/aws-amplify/amplify-cli).

```bash
npm install -g @aws-amplify/cli
```

After installing the official CLI you now have to install this plugin on your local machine.

```bash
git clone https://github.com/awslabs/amplify-mobilehub-migrator.git
cd amplify-mobilehub-migrator && npm install
amplify plugin add
```
Then simply input absolute directory of root path for amplify-mobilehub-migrator. This will add amplify-mobile-hub-migrator as a plugin to amplify CLI.

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

The mobile hub project Id can be retrieved from the url when you navigate to a project in the aws mobile hub console. If not supplied, the plugin will list the projects to select the one to import.

eg. `https://console.aws.amazon.com/mobilehub/home?#/af12bd20-3fbb-1234-bcc3-86fd1a57cb93/build`
> project Id : af12bd20-3fbb-1234-bcc3-86fd1a57cb93

## Notes

- In order to preseve production data in existing mobile hub resources, the migrator plugin cannot be used with the multiple environments feature in Amplify CLI.
- Please report any issues in the 'Issues' tab of this repository.

## License

This library is licensed under the Apache 2.0 License.
