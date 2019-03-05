const path = require('path');
const fs = require('fs-extra');

const cognitoRegionId = 'aws_cognito_region';
const cognitoPoolId = 'aws_cognito_identity_pool_id';
const iosLabel = 'ios';
const androidLabel = 'android';

module.exports = (context) => {
  context.updateRegion = async (frontendModule) => {
    const exportsFilePath = getFilePath(context, frontendModule);
    if (fs.existsSync(exportsFilePath)) {
      const configuration = fs.readFileSync(exportsFilePath, 'utf8');

      if (configuration.indexOf(cognitoRegionId) >= 0) {
        const updatedExportsFile = updateCognitoRegion(configuration, cognitoRegionId);
        fs.writeFileSync(exportsFilePath, updatedExportsFile, 'utf8');
      }
    }
  };
  context.getExportFilePath = (frontendModule) => {
    const exportsFilePath = getFilePath(context, frontendModule);
    const fileStats = fs.stat(exportsFilePath);
    return fileStats.mtime;
  };
};

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

  const frontendConfig = projectConfig.config;
  const srcDirPath = path.join(projectPath, frontendConfig.SourceDir);
  let exportsFileName = '';

  if (frontendModule.constants.Label === androidLabel || frontendModule.constants.Label === iosLabel) {
    exportsFileName = 'awsConfigFilename';
  } else {
    exportsFileName = 'exportsFilename';
  }
  return `${srcDirPath}/${frontendModule.constants[exportsFileName]}`;
}
