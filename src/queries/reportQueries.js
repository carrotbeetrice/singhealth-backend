const awsServices = require("../services/aws/awsServices");
const { v4: uuidv4 } = require("uuid");
const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const _ = require("underscore");
const bcrypt = require("bcrypt");
const excel = require("exceljs");
const pool = db.getPool();
const checklist = require("../../help_me/checklist_format.json");

//TODO: Add the rest of the queries for the reports

const tenantReportColumns = [
  { header: "Report Id", key: "reportid" },
  { header: "Auditor Id", key: "auditorid" },
  { header: "Auditor Name", key: "auditorname" },
  { header: "Outlet Id", key: "outletid" },
  { header: "Outlet Name", key: "outletname" },
  { header: "Tenant Email", key: "tenantemail" },
  { header: "Institution", key: "institution" },
  { header: "Report Type", key: "checklisttype" },
  { header: "Report Score", key: "checklistscore" },
  { header: "Reported On", key: "reportedon" },
];

//TODO: Get rid of this pls
const testImageIds = [
  "little-kittens.jpg",
  "1595e7c9-14da-43a9-885f-32649ad30565",
  "1a16c7b3-c622-4dcb-88de-791be7cfe606",
];

const imageFolder = "cats";

// Testing image upload!
const uploadImage = async (req, res) => {
  const imageId = uuidv4(); //TODO: Save this id into the database!
  const key = `${imageFolder}/${imageId}`;

  await Promise.resolve(
    awsServices.uploadToS3(key, req.file.buffer, req.file.mimetype)
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

// Upload multiple images
const uploadMultipleImages = (req, res) => {
  const images = req.files;

  let promiseArray = awsServices.multipleUpload(imageFolder, images);

  Promise.all(promiseArray)
    .then(() => {
      res.sendStatus(200);
    })
    .catch(() => res.sendStatus(500));
};

// Test getting image url
const getImageUrl = async (req, res) => {
  const key = `${imageFolder}/${req.body.name}`;

  const url = await Promise.resolve(awsServices.getSignedUrl(key));
  console.log(url);
  res.status(200).send({
    signedUrl: url,
  });
};

const getImage = async (req, res) => {
  const key = `${imageFolder}/${req.body.name}`;

  awsServices
    .getImage(key)
    .then((data) => {
      res.setHeader("Content-Type", data.ContentType);
      return res.status(200).send(data.Body);
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
    } else {
      return res.sendStatus(200);
    }
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

// Export tenant report + non-compliance images
const exportTenantReport = (req, res) => {
  let reportId = parseInt(req.body.reportId);

  const getFullReportQuery = sql
    .select()
    .from(`getFullTenantReport(${reportId})`)
    .toParams();

  let promiseArray = awsServices.getMultipleImages(testImageIds);

  Promise.all(promiseArray)
    .then((resolved) => {
      console.log(resolved);
      reportImagesArray = resolved;

      pool.query(
        getFullReportQuery.text,
        getFullReportQuery.values,
        (err, results) => {
          if (err) {
            return res.status(500).send({
              error: err,
            });
          }

          let reportData = results.rows[0];

          let workbook = new excel.Workbook();
          let reportInfoWorksheet = workbook.addWorksheet("Report Info");
          let reportContentsWorksheet = workbook.addWorksheet("Report Content");

          reportInfoWorksheet.columns = tenantReportColumns;

          let rowValues = [];
          rowValues.push(reportData);

          reportInfoWorksheet.addRows(rowValues);

          reportContentsWorksheet.columns = [
            { header: "Question", key: "question", width: 50 },
            { header: "Answer", key: "answer" },
          ];

          populateReportChecklist(reportContentsWorksheet);

          addImageToWorksheet(
            workbook,
            reportContentsWorksheet,
            reportImagesArray
          );

          setExcelResponseHeaders(
            res,
            reportData.reportid,
            reportData.reportedon
          );

          return workbook.xlsx
            .write(res)
            .then(() => {
              res.status(200).end();
            })
            .catch((err) =>
              res.status(500).send({
                error: err,
              })
            );
        }
      );
    })
    .catch((err) => res.status(500).send({ error: err }));
};

const populateReportChecklist = (worksheet) => {
  checklist.forEach((category) => {
    worksheet.addRow({ question: category.category }, "bold");
    category.subcategories.forEach((subcategory) => {
      worksheet.addRow({
        question: subcategory.subcategory,
      });
      subcategory.questions.forEach((question) => {
        worksheet.addRow(question);
      });
    });
  });
};

const setExcelResponseHeaders = (res, id, reportedOn) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=" + `${id}_${reportedOn}_${Date.now()}.xlsx`
  );
};

const addImageToWorksheet = (workbook, worksheet, imageArray) => {
  var imageIdArray = [];

  imageArray.map((image) => {
    imageIdArray.push(
      workbook.addImage({
        buffer: image,
        extension: "jpeg",
      })
    );
  });

  var x = 0.5;

  imageIdArray.map((id) => {
    worksheet.addImage(id, {
      tl: { col: 3.0, row: x },
      br: { col: 10.0, row: x + 10 },
      editAs: "absolute",
    });
    x += 15;
  });
};

module.exports = {
  uploadImage,
  getImageUrl,
  getImage,
  addDefaultQuestion,
  getChecklistQuestions,
  exportTenantReport,
  uploadMultipleImages,
};
