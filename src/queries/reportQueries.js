const awsUpload = require("../aws/awsUpload");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const _ = require("underscore");
const bcrypt = require("bcrypt");
const pool = db.getPool();

//TODO: Add the rest of the queries for the reports
//TODO: Add support for multiple image uploads

// Testing image upload!
const uploadImage = async (req, res) => {
  const imageId = uuidv4();
  const key = `test/${imageId}`;

  await Promise.resolve(
    awsUpload.uploadToS3(key, req.file.buffer, req.file.mimetype)
  )
    .then(() => {
      res.status(201).send({
        message: "Upload success",
      });
    })
    .catch((err) => {
      res.status(500).send({
        error: err,
      });
    });
};

// Test getting image url
const getImageUrl = async (req, res) => {
  const key = `test/${req.body.name}`;

  const url = await Promise.resolve(awsUpload.getSignedUrl(key));
  console.log(url);
  res.sendStatus(200);
};

const getImage = async (req, res) => {
  const key = `test/${req.body.name}`;

  awsUpload
    .getImage(key)
    .then((data) => {
      let file = __dirname + "/../../test_images/download.jpg";
      fs.writeFile(file, data.Body, (err) => {
        if (err) {
          return res.status(500).send({
            error: err,
          });
        } else {
          return res.status(200).send({
            message: "Downloaded",
          });
        }
      });
    })
    .catch((err) => {
      // throw err;
      return res.status(500).send({
        error: err,
      });
    });
};

// DEVELOPMENT ONLY
const addDefaultQuestion = (req, res) => {
  var questionInsertData = {
    Question: req.body.question,
    CategoryId: req.body.categoryid,
    SubcategoryId: req.body.subcategoryid,
  };

  const insertQuery = sql
    .insert("DefaultChecklistQuestions", questionInsertData)
    .toParams();

  pool.query(insertQuery.text, insertQuery.values, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send({
        error: err,
      });
    } else {return res.sendStatus(200);}
  });
};

const getChecklistQuestions = (req, res) => {
  let checklistTypeId = parseInt(req.body.checklistType);

  // select * from getChecklistQuestions(1)
  const getQuestionsQuery = sql
    .select()
    .from(`getChecklistQuestions(${checklistTypeId})`)
    .toParams();

  pool.query(
    getQuestionsQuery.text,
    getQuestionsQuery.values,
    (err, results) => {
      if (err) {
        return res.status(500).send({
          error: err,
        });
      } else {
        return res.status(200).send(results.rows[0].checklistquestions);
      }
    }
  );
};

module.exports = {
  uploadImage,
  getImageUrl,
  getImage,
  addDefaultQuestion,
  getChecklistQuestions,
};
