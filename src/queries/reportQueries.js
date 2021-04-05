const awsUpload = require('../aws/awsUpload');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Testing image upload!
const uploadImage = async (req, res) => {
    const imageId = uuidv4();
    const key = `test/${imageId}`;

    await Promise.resolve(awsUpload.uploadToS3(key, req.file.buffer, req.file.mimetype)
    ).then(() => {
        res.status(201).send({
            message: "Upload success"
        });
    })
    .catch((err) => {
        res.status(500).send({
            error: err
        });
    });


}

// Test getting image url
const getImageUrl = async (req, res) => {
    const key = `test/${req.body.name}`;

    const url = await Promise.resolve(awsUpload.getSignedUrl(key));
    console.log(url);
    res.sendStatus(200);
}

const getImage = async (req, res) => {
    const key = `test/${req.body.name}`;

    awsUpload.getImage(key)
    .then((data) => {
        let file = __dirname + '/../../test_images/download.jpg';
        fs.writeFile(file, data.Body, (err) => {
            if (err) {
                return res.status(500).send({
                    error: err
                });             
            } else {
                return res.status(200).send({
                    message: "Downloaded"
                });
            }
        });

    })
    .catch((err) => {
        // throw err;
        return res.status(500).send({
            error: err
        });
    });
}

module.exports = {
    uploadImage,
    getImageUrl,
    getImage
}