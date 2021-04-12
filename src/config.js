require('dotenv').config();

module.exports = {
    aws: {
        SECRET: process.env.JWT_SECRET,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        REGION: process.env.REGION,
        BUCKET_NAME: process.env.BUCKET_NAME,
        SIGNATURE_VERSION: "v4",
    },
    email: {
        MAIL_USERNAME: process.env.MAIL_USERNAME,
        MAIL_PASSWORD: process.env.MAIL_PASSWORD,
        OAUTH_CLIENTID: process.env.OAUTH_CLIENTID,
        OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
        OAUTH_REFRESH_TOKEN: process.env.OAUTH_REFRESH_TOKEN,
    },
};