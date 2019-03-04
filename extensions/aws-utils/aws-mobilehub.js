// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const aws = require('./aws.js');

class Mobile {
  constructor(context) {
    return aws.configureWithCreds(context)
      .then((awsItem) => {
        this.context = context;
        this.mobile = new awsItem.Mobile();
        return this;
      });
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
