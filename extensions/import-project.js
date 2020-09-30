// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require('fs-extra');
const ora = require('ora');
const inquirer = require('inquirer');
const { getLambdaFunctionDetails, getDynamoDbDetails, getPinpointChannelDetail } = require('./import-helper');
const { updateRegion } = require('./region-updater');

const spinner = ora('');

async function importProject(context) {
  process.env.AWS_SDK_LOAD_CONFIG = true;

  const providerPlugins = context.amplify.getProviderPlugins(context);
  // eslint-disable-next-line dot-notation
  const provider = require(providerPlugins['awscloudformation']);
  const { getConfiguredAWSClient } = provider;
  const awssdk = await getConfiguredAWSClient(context);
  const configuredAWSClient = await awssdk.configureWithCreds(context);

  const frontendPlugins = context.amplify.getFrontendPlugins(context);
  const projectConfigFilePath = context.amplify.pathManager.getProjectConfigFilePath();
  const projectConfig = JSON.parse(fs.readFileSync(projectConfigFilePath));

  try {
    const providerInfoConfig = context.amplify.pathManager.getProviderInfoFilePath();
    const providerInfo = JSON.parse(fs.readFileSync(providerInfoConfig));

    if (Object.keys(providerInfo).length > 1) {
      context.print.error('Importing a mobile hub project into an amplify project with multiple environments is currently not supported.');
      return;
    }

    const currentEnv = providerInfo[Object.keys(providerInfo)[0]];
    const currentEnvCategories = currentEnv.categories;
    const hasExistingResources = () => {
      let result = false;

      if (currentEnvCategories) {
        Object.keys(currentEnvCategories).forEach((category) => {
          if (Object.keys(currentEnvCategories[category]).length > 0) {
            result = true;
          }
        });
      }

      return result;
    };

    if (hasExistingResources()) {
      context.print.error('Importing a mobile hub project into an amplify project with existing resources is currently not supported.');
      return;
    }

    let amplifyProjectRegion;

    if (currentEnv.awscloudformation && currentEnv.awscloudformation.Region) {
      amplifyProjectRegion = currentEnv.awscloudformation.Region;
    } else {
      context.print.error('The region of the amplify project cannot bet determined from the team-provider-info.json file.');
      return;
    }

    let projectId;

    if (!context.parameters.first) {
      const mobileHubClient = new configuredAWSClient.Mobile({ region: 'us-east-1' });
      const result = await mobileHubClient.listProjects().promise();

      if (result.projects.length === 0) {
        context.print.error("Nothing to import, you don't have any MobileHub project.");
        return;
      }

      const choices = result.projects.map(project => ({
        name: `${project.name} (${project.projectId})`,
        value: project.projectId,
      }));

      const answer = await inquirer.prompt([{
        type: 'list',
        name: 'projectId',
        message: 'Select the project to import',
        choices,
      }]);

      ({ projectId } = answer);
    } else {
      projectId = context.parameters.first;
    }

    spinner.start('Importing your project');

    const mobileHubClient = new configuredAWSClient.Mobile({ region: 'us-east-1' });
    const params = {
      projectId,
    };

    const projectResources = await mobileHubClient.describeProject(params).promise();

    if (projectResources.details.region !== amplifyProjectRegion) {
      context.print.error(`Mobile hub project region '${projectResources.details.region}' and amplify project region: '${amplifyProjectRegion}' must be the same. Importing from different regions is currently not supported.`);
      return;
    }

    const mobileHubResources = await createAmplifyMetaConfig(projectResources, configuredAWSClient);

    await persistResourcesToConfig(mobileHubResources, context);

    const frontendHandlerModule = require(frontendPlugins[projectConfig.frontend]);

    // Get cloud amplify meta
    let cloudAmplifyMeta = {};
    const currentAmplifyMetafilePath = context.amplify.pathManager.getCurrentAmplifyMetaFilePath();

    if (fs.existsSync(currentAmplifyMetafilePath)) {
      cloudAmplifyMeta = readJsonFile(currentAmplifyMetafilePath);
    }

    frontendHandlerModule.createFrontendConfigs(context,
      getResourceOutputs(context),
      getResourceOutputs(context, cloudAmplifyMeta));

    await persistResourcesToConfig(mobileHubResources, context);

    updateRegion(context, frontendHandlerModule);

    await uploadToS3(context, configuredAWSClient);

    spinner.succeed('Your Mobile Hub project was successfully imported.');
  } catch (error) {
    spinner.fail(`There was an error importing your Mobile Hub project: ${error}`);
    throw error;
  }
}

async function uploadToS3(context, configuredAWSClient) {
  const amplifyMetaConfig = getAmplifyMetaConfig(context);
  const deploymentBucket = amplifyMetaConfig.providers.awscloudformation.DeploymentBucketName;
  const s3 = new configuredAWSClient.S3({ region: 'us-east-1' });
  const params = {
    Bucket: deploymentBucket,
    Key: 'amplify-meta.json',
    Body: JSON.stringify(amplifyMetaConfig),
  };

  try {
    const data = await s3.putObject(params).promise();
    console.log(data);
  } catch (error) {
    console.log(`There was an error while uploading '${params.Key}' to S3: ${error}`);
  }
}

async function createAmplifyMetaConfig(mobileHubResources, configuredAWSClient) {
  const mobileHubAmplifyMap = {
    'user-signin': 'auth',
    analytics: 'analytics',
    'user-data': 'storage',
    hosting: 'storage',
    database: 'database',
    'cloud-api': 'api',
    bots: 'interactions',
  };
  let config = {};

  const featurePromises = Object.keys(mobileHubAmplifyMap).map(async (mobileHubCategory) => {
    const featureResult = mobileHubResources.details.resources
      .filter(resource => resource.feature === mobileHubCategory);
    featureResult.region = mobileHubResources.details.region;

    if (featureResult) {
      // eslint-disable-next-line max-len
      config = await buildCategory(featureResult, mobileHubAmplifyMap, mobileHubCategory, config, configuredAWSClient);
    }
  });

  await Promise.all(featurePromises);

  return config;
}

async function buildCategory(featureResult, mobileHubAmplifyMap, mobileHubCategory,
  config, configuredAWSClient) {
  const amplifyCategory = mobileHubAmplifyMap[mobileHubCategory];

  switch (amplifyCategory) {
    case 'auth':
      return createAuth(featureResult, config);
    case 'analytics':
      return await createAnalytics(featureResult, config, configuredAWSClient);
    case 'storage':
      return createStorage(featureResult, config);
    case 'database':
      return await createTables(featureResult, config, configuredAWSClient);
    case 'api':
      return await createApi(featureResult, config, configuredAWSClient);
    case 'interactions':
      return createInteractions(featureResult, config);
    default:
      return config;
  }
}

function createAuth(featureResult, config) {
  const hasAuth = featureResult.find(item => item.type === 'AWS::Cognito::IdentityPool')
    && featureResult.find(item => item.type === 'AWS::Cognito::UserPool');

  if (hasAuth) {
    config.auth = {};
    config.auth[`cognito${new Date().getMilliseconds()}`] = {
      service: 'Cognito',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        IdentityPoolId: featureResult.find(item => item.type === 'AWS::Cognito::IdentityPool').attributes.poolid,
        IdentityPoolName: featureResult.find(item => item.type === 'AWS::Cognito::IdentityPool').name,
        AppClientSecret: featureResult.find(item => item.type === 'AWS::Cognito::UserPool').attributes['user-pools-client-secret'],
        UserPoolId: featureResult.find(item => item.type === 'AWS::Cognito::UserPool').attributes['user-pools-id'],
        AppClientIDWeb: featureResult.find(item => item.type === 'AWS::Cognito::UserPool').attributes['user-pools-web-client-id'],
        AppClientID: featureResult.find(item => item.type === 'AWS::Cognito::UserPool').attributes['user-pools-client-id'],
        UserPoolName: featureResult.find(item => item.type === 'AWS::Cognito::UserPool').name,
      },
    };
  }

  return config;
}

async function createAnalytics(featureResult, config, configuredAWSClient) {
  const hasAnalytics = featureResult.find(item => item.type === 'AWS::Pinpoint::AnalyticsApplication');

  if (hasAnalytics) {
    config.analytics = {};
    config.analytics[`analytics${new Date().getMilliseconds()}`] = {
      service: 'Pinpoint',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        appName: featureResult.find(item => item.type === 'AWS::Pinpoint::AnalyticsApplication').name,
        Region: featureResult.region,
        Id: featureResult.find(item => item.type === 'AWS::Pinpoint::AnalyticsApplication').arn,
      },
    };

    config = await createNotifications(featureResult, config, configuredAWSClient);
  }

  return config;
}

function createStorage(featureResult, config) {
  const hasS3 = featureResult.find(item => item.type === 'AWS::S3::Bucket' && item.feature === 'user-data');

  if (hasS3) {
    config.storage = {};
    config.storage[`s3${new Date().getMilliseconds()}`] = {
      service: 'S3',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        BucketName: featureResult.find(item => item.type === 'AWS::S3::Bucket').name,
        Region: featureResult.find(item => item.type === 'AWS::S3::Bucket').attributes.region,
      },
    };
  }

  config = createHosting(featureResult, config);

  return config;
}

async function createTables(featureResult, config, configuredAWSClient) {
  const hasDynamoDb = featureResult.find(item => item.type === 'AWS::DynamoDB::Table');

  if (hasDynamoDb) {
    if (!config.storage) {
      config.storage = {};
    }

    const tableName = featureResult.find(item => item.type === 'AWS::DynamoDB::Table').name;
    const serviceName = `dynamo${new Date().getMilliseconds()}`;

    config.storage[serviceName] = {
      service: 'DynamoDb',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        Region: featureResult.region,
        Arn: featureResult.find(item => item.type === 'AWS::DynamoDB::Table').arn,
        Name: tableName,
      },
    };

    const tableDetails = await getDynamoDbDetails({ region: featureResult.region }, tableName,
      configuredAWSClient);
    const partitionKey = tableDetails.Table.KeySchema
      .find(item => item.KeyType === 'HASH').AttributeName;
    const partitionKeyType = tableDetails.Table.AttributeDefinitions
      .find(item => item.AttributeName === partitionKey).AttributeType;

    config.storage[serviceName].output.PartitionKeyName = partitionKey;
    config.storage[serviceName].output.PartitionKeyType = partitionKeyType;
  }

  return config;
}

function createHosting(featureResult, config) {
  const hasHosting = featureResult.find(item => item.type === 'AWS::S3::Bucket' && item.feature === 'hosting');

  if (hasHosting) {
    config.hosting = {};
    config.hosting.S3AndCloudFront = {
      service: 'S3AndCloudFront',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        S3BucketSecureURL: featureResult.find(item => item.type === 'AWS::S3::Bucket').attributes['s3-bucket-console-url'],
        WebsiteURL: featureResult.find(item => item.type === 'AWS::S3::Bucket').attributes['s3-bucket-website-url'],
        Region: featureResult.find(item => item.type === 'AWS::S3::Bucket').attributes.region,
        HostingBucketName: featureResult.find(item => item.type === 'AWS::S3::Bucket').name,
      },
    };
  }

  return config;
}

async function createApi(featureResult, config, configuredAWSClient) {
  const hasApi = featureResult.some(item => item.type === 'AWS::ApiGateway::RestApi');
  const hasFunctions = featureResult.some(item => item.type === 'AWS::Lambda::Function');

  if (hasApi) {
    config.api = {};
    // eslint-disable-next-line dot-notation
    const physicalId = featureResult.find(item => item.type === 'AWS::ApiGateway::RestApi').attributes['cfPhysicalID'];
    // eslint-disable-next-line prefer-destructuring, dot-notation
    const region = featureResult.find(item => item.type === 'AWS::ApiGateway::RestApi').attributes['region'];

    config.api[`api${new Date().getMilliseconds()}`] = {
      service: 'API Gateway',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        ApiName: featureResult.find(item => item.type === 'AWS::ApiGateway::RestApi').name,
        RootUrl: `https://${physicalId}.execute-api.${region}.amazonaws.com/Development`,
      },
    };
  }

  if (hasFunctions) {
    config.function = {};
    const functions = featureResult.filter(item => item.type === 'AWS::Lambda::Function');
    const functionPromises = functions.map(async (element) => {
      // eslint-disable-next-line max-len
      const functionDetails = await getLambdaFunctionDetails({ region: featureResult.region }, element.name, configuredAWSClient);

      if (!element.attributes.status.includes('DELETE_SKIPPED')) {
        config.function[`${element.name}`] = {
          service: 'Lambda',
          lastPushTimeStamp: new Date().toISOString(),
          build: true,
          output: {
            Region: element.attributes.region,
            Arn: functionDetails.Configuration.FunctionArn,
            Name: element.name,
          },
        };
      }
    });

    await Promise.all(functionPromises);
  }

  return config;
}

function createInteractions(featureResult, config) {
  const hasBots = featureResult.some(item => item.type === 'AWS::Lex::Bot');

  if (hasBots) {
    config.interactions = {};
    config.interactions[`lex${new Date().getMilliseconds()}`] = {
      service: 'Lex',
      lastPushTimeStamp: new Date().toISOString(),
      output: {
        FunctionArn: featureResult.find(item => item.type === 'AWS::Lex::Bot').arn,
        Region: featureResult.find(item => item.type === 'AWS::Lex::Bot').attributes.region,
        BotName: featureResult.find(item => item.type === 'AWS::Lex::Bot').name,
      },
    };
  }

  return config;
}

async function createNotifications(featureResult, config, configuredAWSClient) {
  if (hasNotifications(featureResult)) {
    const appName = featureResult.find(item => item.type === 'AWS::Pinpoint::AnalyticsApplication').name;
    const applicationId = featureResult.find(item => item.type === 'AWS::Pinpoint::AnalyticsApplication').arn;
    const channels = {
      appName,
      applicationId,
      Email: featureResult.find(item => item.type === 'AWS::Pinpoint::EmailChannel'),
      SMS: featureResult.find(item => item.type === 'AWS::Pinpoint::SMSChannel'),
      GCM: featureResult.find(item => item.type === 'AWS::Pinpoint::GCMChannel'),
      APNS: featureResult.find(item => item.type === 'AWS::Pinpoint::APNSChannel'),
    };
    featureResult.region = 'us-east-1';
    config.notifications = {};
    config.notifications[`${appName}`] = {
      service: 'Pinpoint',
      lastPushTimeStamp: new Date().toISOString(),
    };
    // eslint-disable-next-line max-len
    config.notifications[appName].output = await createNotificationsOutput(featureResult, channels, configuredAWSClient);
  }

  return config;
}

function hasNotifications(featureResult) {
  return featureResult.find(item => item.type === 'AWS::Pinpoint::AnalyticsApplication')
  && (featureResult.find(item => item.type === 'AWS::Pinpoint::EmailChannel')
  || featureResult.find(item => item.type === 'AWS::Pinpoint::SMSChannel')
  || featureResult.find(item => item.type === 'AWS::Pinpoint::GCMChannel')
  || featureResult.find(item => item.type === 'AWS::Pinpoint::APNSChannel')
  );
}

function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  return content;
}

function readJsonFile(jsonFilePath, encoding = 'utf8') {
  return JSON.parse(stripBOM(fs.readFileSync(jsonFilePath, encoding)));
}

async function createNotificationsOutput(featureResult, channels, configuredAWSClient) {
  const output = {
    Name: channels.appName,
    Id: channels.applicationId,
    Region: featureResult.region,
  };

  if (channels.GCM) {
    output.FCM = {};
    output.FCM = await getPinpointChannelDetail({ region: featureResult.region }, 'GCM', channels.applicationId, configuredAWSClient);
  }

  if (channels.SMS) {
    output.SMS = {};
    output.SMS = await getPinpointChannelDetail({ region: featureResult.region }, 'SMS', channels.applicationId, configuredAWSClient);
  }

  if (channels.Email) {
    output.Email = {};
    output.Email = await getPinpointChannelDetail({ region: featureResult.region }, 'Email', channels.applicationId, configuredAWSClient);
  }

  if (channels.APNS) {
    output.APNS = {};
    output.APNS = await getPinpointChannelDetail({ region: featureResult.region }, 'APNS', channels.applicationId, configuredAWSClient);
  }

  return output;
}

async function persistResourcesToConfig(mobileHubResources, context) {
  if (mobileHubResources) {
    const amplifyMetaConfig = getAmplifyMetaConfig(context);
    const mergedBackendConfig = mergeConfig(amplifyMetaConfig, mobileHubResources);

    persistToFile(mergedBackendConfig, context.amplify.pathManager.getAmplifyMetaFilePath());
    persistToFile(mergedBackendConfig, context.amplify.pathManager.getCurrentAmplifyMetaFilePath());
  }
}

function persistToFile(mergedBackendConfig, filePath) {
  const amplifyMetaFilePath = filePath;
  const jsonString = JSON.stringify(mergedBackendConfig, null, 2);

  fs.writeFileSync(amplifyMetaFilePath, jsonString, 'utf8');
}

function getAmplifyMetaConfig(context) {
  const amplifyMetaConfig = context.amplify.pathManager.getAmplifyMetaFilePath();

  return JSON.parse(fs.readFileSync(amplifyMetaConfig));
}

function mergeConfig(amplifyMetaConfig, mobilehubResources) {
  if (amplifyMetaConfig.providers) {
    Object.keys(mobilehubResources).forEach((category) => {
      amplifyMetaConfig[category] = mobilehubResources[category];
    });
  }

  return amplifyMetaConfig;
}

function getResourceOutputs(context, amplifyMeta) {
  if (!amplifyMeta) {
    const amplifyMetaFilePath = context.amplify.pathManager.getAmplifyMetaFilePath();

    amplifyMeta = JSON.parse(fs.readFileSync(amplifyMetaFilePath));
  }

  // Build the provider object
  const outputsByProvider = {};
  const outputsByCategory = {};
  const outputsForFrontend = {
    metadata: {},
    serviceResourceMapping: {},
  };

  Object.keys(amplifyMeta.providers).forEach((provider) => {
    outputsByProvider[provider] = {};
    outputsByProvider[provider].metadata = amplifyMeta.providers[provider] || {};
    outputsByProvider[provider].serviceResourceMapping = {};
  });

  Object.keys(amplifyMeta).forEach((category) => {
    const categoryMeta = amplifyMeta[category];

    Object.keys(categoryMeta).forEach((resourceName) => {
      const resourceMeta = categoryMeta[resourceName];

      if (resourceMeta.output) {
        const { providerPlugin } = resourceMeta;

        if (!outputsByProvider[providerPlugin]) {
          outputsByProvider[providerPlugin] = {
            metadata: {},
            serviceResourceMapping: {},
          };
        }

        if (!outputsByProvider[providerPlugin].serviceResourceMapping[resourceMeta.service]) {
          outputsByProvider[providerPlugin].serviceResourceMapping[resourceMeta.service] = [];
        }

        // eslint-disable-next-line max-len
        outputsByProvider[providerPlugin].serviceResourceMapping[resourceMeta.service].push(resourceMeta);

        if (!outputsByCategory[category]) {
          outputsByCategory[category] = {};
        }

        if (resourceMeta.service) {
          resourceMeta.output.service = resourceMeta.service;
        }
        outputsByCategory[category][resourceName] = resourceMeta.output;

        // for frontend configuration file generation
        if (!outputsForFrontend.serviceResourceMapping[resourceMeta.service]) {
          outputsForFrontend.serviceResourceMapping[resourceMeta.service] = [];
        }

        outputsForFrontend.serviceResourceMapping[resourceMeta.service].push(resourceMeta);
      }
    });
  });

  if (outputsByProvider.awscloudformation) {
    outputsForFrontend.metadata = outputsByProvider.awscloudformation.metadata;
  }

  return {
    outputsByProvider,
    outputsByCategory,
    outputsForFrontend,
  };
}

module.exports = {
  importProject,
};
