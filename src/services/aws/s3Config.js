const config = require('../../config');
const aws = require('aws-sdk');

const initialise = () => {
    const awsConfigs = config.aws;
    const s3 = new aws.S3({
        accessKeyId: awsConfigs.AWS_ACCESS_KEY_ID,
        secretAccessKey: awsConfigs.AWS_SECRET_ACCESS_KEY,
        signatureVersion: awsConfigs.SIGNATURE_VERSION,
        region: awsConfigs.REGION
    });
    return s3;
}

module.exports = {initialise};