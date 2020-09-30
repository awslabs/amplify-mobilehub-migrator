// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

async function getLambdaFunctionDetails(options, name, configuredAWSClient) {
  const awsOptions = {};

  if (options && options.region) {
    awsOptions.region = options.region;
  }

  const lambda = new configuredAWSClient.Lambda({ region: awsOptions.region });
  const result = await lambda.getFunction({ FunctionName: name }).promise();

  return result;
}

async function getDynamoDbDetails(options, name, configuredAWSClient) {
  const awsOptions = {};

  if (options && options.region) {
    awsOptions.region = options.region;
  }

  const dynamoDb = new configuredAWSClient.DynamoDB({ region: awsOptions.region });
  const result = await dynamoDb.describeTable({ TableName: name }).promise();

  return result;
}

async function getPinpointChannelDetail(options, channel, applicationId, configuredAWSClient) {
  const awsOptions = {};

  if (options.region) {
    awsOptions.region = options.region;
  }

  const pinpoint = new configuredAWSClient.Pinpoint({ region: awsOptions.region });

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
}

module.exports = {
  getLambdaFunctionDetails,
  getDynamoDbDetails,
  getPinpointChannelDetail,
};
