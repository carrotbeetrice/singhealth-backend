const awsConfig = require("../../config").aws;
const s3Config = require("./s3Config");
const s3 = s3Config.initialise();
const { v4: uuidv4 } = require("uuid");

const uploadToS3 = async (key, buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    s3.putObject(
      {
        Bucket: awsConfig.BUCKET_NAME,
        ContentType: mimetype,
        Key: key,
        Body: buffer,
      },
      () => resolve()
    );
  });
};

const multipleUpload = (imageFolder, images) => {
  let promiseArray = [];

  images.map((item) => {
    let promise = new Promise((resolve) => {
      let imageId = uuidv4();
      let imageKey = `${imageFolder}/${imageId}`;
      s3.putObject(
        {
          Bucket: awsConfig.BUCKET_NAME,
          ContentType: item.mimetype,
          Key: imageKey,
          Body: item.buffer,
        },
        () => resolve(imageKey)
      );
    });
    promiseArray.push(promise);
  });

  return promiseArray;
};

const getSignedUrl = (key, expires = 3600) => {
  return new Promise((resolve, reject) => {
    s3.getSignedUrl(
      "getObject",
      {
        Bucket: awsConfig.BUCKET_NAME,
        Key: key,
        Expires: expires,
      },
      (err, url) => {
        if (err) throw err;
        resolve(url);
      }
    );
  });
};

const getImage = (key) => {
  return s3
    .getObject({
      Key: key,
      Bucket: awsConfig.BUCKET_NAME,
    })
    .promise();
};

const getMultipleImages = (keys) => {
  var imageArray = [];
  let promiseArray = [];

  keys.map((key) => {
    let promise = new Promise((resolve) => {
      getImage(key)
        .then((data) => {
          const imageBuffer = Buffer.from(data.Body);
          return imageBuffer;
        })
        .then((buffer) => {
          imageArray.push(buffer);
          return resolve(buffer);
        })
        .catch((err) => console.error(err));
    });
    promiseArray.push(promise);
  });

  return promiseArray;
};

module.exports = {
  uploadToS3,
  multipleUpload,
  getSignedUrl,
  getImage,
  getMultipleImages,
};
