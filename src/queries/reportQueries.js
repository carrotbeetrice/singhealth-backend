const awsUpload = require("../services/aws/awsUpload");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const _ = require("underscore");
const bcrypt = require("bcrypt");
const excel = require('exceljs');
const { report } = require("../routes/root");
const pool = db.getPool();
const checklist = require('../../help_me/checklist_format.json');

//TODO: Add the rest of the queries for the reports
//TODO: Add support for multiple image uploads

const tenantReportColumns = [
  {header: "Report Id", key: "reportid"},
  {header: "Auditor Id", key: "auditorid"},
  {header: "Auditor Name", key: "auditorname"},
  {header: "Outlet Id", key: "outletid"},
  {header: "Outlet Name", key: "outletname"},
  {header: "Tenant Email", key: "tenantemail"},
  {header: "Institution", key: "institution"},
  {header: "Report Type", key: "checklisttype"},
  {header: "Report Score", key: "checklistscore"},
  {header: "Reported On", key: "reportedon"},
];

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

// Export tenant report
const exportTenantReport = (req, res) => {
  let reportId = parseInt(req.body.reportId);

  const getFullReportQuery = sql.select().from(`getFullTenantReport(${reportId})`).toParams();

  pool.query(getFullReportQuery.text, getFullReportQuery.values, (err, results) => {
    if (err)  {
      return res.status(500).send({
        error: err
      });
    }

    let reportData = results.rows[0];

    let workbook = new excel.Workbook();
    let reportInfoWorksheet = workbook.addWorksheet();
    let reportContentsWorksheet = workbook.addWorksheet();

    reportInfoWorksheet.columns = tenantReportColumns;

    let rowValues = [];
    rowValues.push(reportData);

    reportInfoWorksheet.addRows(rowValues);

    reportContentsWorksheet.columns = [
      {header: "Question", key: "question", width: 50},
      {header: "Answer", key: "answer"},
    ];

    checklist.forEach((category) => {
      reportContentsWorksheet.addRow({question: category.category}, "bold");
      category.subcategories.forEach((subcategory) => {
        reportContentsWorksheet.addRow({question: subcategory.subcategory});
        subcategory.questions.forEach((question) => {
          reportContentsWorksheet.addRow(question);
        });
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + `${reportData.reportid}_${reportData.reportedon}_${Date.now()}.xlsx`
    );

    return workbook.xlsx.write(res)
    .then(() =>  {
      res.status(200).end();
    })
    .catch(() => res.sendStatus(500));

  });

};

module.exports = {
  uploadImage,
  getImageUrl,
  getImage,
  addDefaultQuestion,
  getChecklistQuestions,
  exportTenantReport,
};
