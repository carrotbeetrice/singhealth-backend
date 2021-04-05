const config = require('../config');
const aws = require('aws-sdk');

const initialise = () => {
    const s3 = new aws.S3({
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        signatureVersion: "v4",
        region: config.REGION
    });
    return s3;
}

module.exports = {initialise};