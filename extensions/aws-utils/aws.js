// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
process.env.AWS_SDK_LOAD_CONFIG = true;
const awsConfigurator = require('amplify-provider-awscloudformation');

module.exports = {
  getConfiguredSDK: async (context) => {
    return await awsConfigurator.getConfiguredAWSClient(context);
  }
}

