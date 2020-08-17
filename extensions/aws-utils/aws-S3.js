const aws = require('./aws.js');

class S3 {
  async init(context) {
    const aws_sdk = await aws.getConfiguredSDK(context);
    const awsItem = await aws_sdk.configureWithCreds(context);
    this.context = context;
    this.S3 = new awsItem.S3({ region: 'us-east-1' });
  }
  putObject(params) {
      return this.S3.putObject(params).promise();
  }
}

module.exports = S3;