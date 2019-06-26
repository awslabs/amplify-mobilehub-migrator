// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const aws = require('./aws.js');

class Mobile {
  
  async init(context) {
    const aws_sdk = await aws.getConfiguredSDK(context);
    const awsItem = await aws_sdk.configureWithCreds(context);
    this.context = context;
    this.mobile = new awsItem.Mobile({ region: 'us-east-1' });
  }

  getProjectResources(projectId) {
    const params = {
      projectId,
    };
    return this.mobile.describeProject(params).promise().then((result => result));
  }

  listProjects() {
    return this.mobile.listProjects().promise();
  }
}

module.exports = Mobile;
