const config = require('../config');
const s3Config = require('./s3Config');
const s3 = s3Config.initialise();

const uploadToS3 = async (key, buffer, mimetype) => {
    return new Promise((resolve, reject) => {
        s3.putObject({
            Bucket: config.BUCKET_NAME,
            ContentType: mimetype,
            Key: key,
            Body: buffer
        }, () => resolve());
    });
}

const getSignedUrl = (key, expires = 3600) => {
    return new Promise((resolve, reject) => {
        s3.getSignedUrl("getObject", {
            Bucket: config.BUCKET_NAME,
            Key: key,
            Expires: expires
        }, (err, url) => {
            if (err) throw err;
            resolve(url);
        });
    });
}

const getImage = (key) => {
    return s3.getObject({
        Key: key,
        Bucket: config.BUCKET_NAME
    }).promise();
}

module.exports = {
    uploadToS3,
    getSignedUrl,
    getImage
}