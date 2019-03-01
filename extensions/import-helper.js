// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const { getConfiguredAWSClient } = require('amplify-provider-awscloudformation');

module.exports = (context) => {
  context.getLambdaFunctionDetails = async (options, name) => {
    const awsOptions = {};
    if (options.region) {
      awsOptions.region = options.region;
    }

    const lambda = await getConfiguredLambdaClient(context, awsOptions);
    const result = await lambda.getFunction({ FunctionName: name }).promise();
    return result;
  };
  context.getDynamoDbDetails = async (options, name) => {
    const awsOptions = {};
    if (options.region) {
      awsOptions.region = options.region;
    }
    const dynamoDb = await getConfiguredDynamoDbClient(context, awsOptions);
    const result = await dynamoDb.describeTable({ TableName: name }).promise();
    return result;
  };
  context.getPinpointChannelDetail = async (options, channel, applicationId) => {
    const awsOptions = {};
    if (options.region) {
      awsOptions.region = options.region;
    }
    const pinpoint = await getConfiguredPinpointClient(context, awsOptions);
    if (channel === 'SMS') {
      return await pinpoint.getSmsChannel({ ApplicationId: applicationId }).promise();
    }
    if (channel === 'Email') {
      return await pinpoint.getEmailChannel({ ApplicationId: applicationId }).promise();
    }
    if (channel === 'GCM') {
      return await pinpoint.getGcmChannel({ ApplicationId: applicationId }).promise();
    }
    if (channel === 'APNS') {
      return await pinpoint.getApnsChannel({ ApplicationId: applicationId }).promise();
    }
  };
};
async function getConfiguredLambdaClient(context, awsOptions) {
  const awsClient = await getConfiguredAWSClient(context);
  awsClient.config.update(awsOptions);
  return new awsClient.Lambda();
}
async function getConfiguredDynamoDbClient(context, awsOptions) {
  const awsClient = await getConfiguredAWSClient(context);
  awsClient.config.update(awsOptions);
  return new awsClient.DynamoDB();
}
async function getConfiguredPinpointClient(context, awsOptions) {
  const awsClient = await getConfiguredAWSClient(context);
  awsClient.config.update(awsOptions);
  return new awsClient.Pinpoint();
}
