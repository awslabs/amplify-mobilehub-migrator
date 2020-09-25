// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const path = require('path');
const fs = require('fs-extra');

const cognitoRegionId = 'aws_cognito_region';
const cognitoPoolId = 'aws_cognito_identity_pool_id';
const javaScriptLabel = 'javascript';
const iosLabel = 'ios';
const androidLabel = 'android';

async function updateRegion(context, frontendModule) {
  const exportsFilePath = getFilePath(context, frontendModule);

  if (fs.existsSync(exportsFilePath)) {
    const configuration = fs.readFileSync(exportsFilePath, 'utf8');

    if (configuration.indexOf(cognitoRegionId) >= 0) {
      const updatedExportsFile = updateCognitoRegion(configuration, cognitoRegionId);

      fs.writeFileSync(exportsFilePath, updatedExportsFile, 'utf8');
    }
  }
}

function updateCognitoRegion(configuration, searchKey) {
  let configurations = configuration.split('\n');
  const actualCognitoRegion = configurations.find(n => n.includes(cognitoPoolId));

  if (actualCognitoRegion) {
    const cognitoPair = actualCognitoRegion.split(':');
    const [region] = cognitoPair[1].split(':');

    configurations = configurations.map((line) => {
      if (line.includes(searchKey)) {
        const resourcePair = line.split(':');
        resourcePair[1] = `${region}",`;
        line = resourcePair.join(':');
        return line;
      }
      return line;
    });
  }
  return configurations.join('\n');
}


function getFilePath(context, frontendModule) {
  const { amplify } = context;

  const projectPath = context.exeInfo
    ? context.exeInfo.localEnvInfo.projectPath
    : amplify.getEnvInfo().projectPath;

  const projectConfig = context.exeInfo
    ? context.exeInfo.projectConfig[frontendModule.constants.Label]
    : amplify.getProjectConfig()[frontendModule.constants.Label];

  switch (frontendModule.constants.Label) {
    case androidLabel: {
      const frontendConfig = projectConfig.config;
      return path.join(projectPath, frontendConfig.ResDir, 'raw', frontendModule.constants.awsConfigFilename);
    }
    case iosLabel:
      return path.join(projectPath, frontendModule.constants.awsConfigFilename);
    case javaScriptLabel: {
      const frontendConfig = projectConfig.config;
      return path.join(projectPath, frontendConfig.SourceDir, frontendModule.constants.exportsFilename);
    }
    default:
      throw new Error(`Migrator plugin does not support frontend: ${frontendModule.constants.Label}`);
  }
}

module.exports = {
  updateRegion,
};
