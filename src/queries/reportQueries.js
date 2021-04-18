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
// const testImageKeys = [{ ImageId: 28 }, { ImageId: 29 }, { ImageId: 30 }];
// const testReportId = 2;
const imageFolders = {
  test: "cats",
  nonCompliances: "non_compliances",
};

const passingScore = 95;

/*
Steps:
1) Upload images to S3 bucket and return image keys
2) Save image keys into database, return primary keys of newly inserted image records
3) Check if tenant ID exists in database, send error response if not exists
4) Save report info into database, return newly inserted report id
5) Map report id to image records, if any
6) If score is below 95%, add non-compliance record
 */
const createAuditReport = (req, res) => {
  let promiseArray = awsServices.multipleUpload(imageFolders.nonCompliances, req.files); // Step 1

  Promise.all(promiseArray)
    .then(async (vals) => {
      // vals is the array of uploaded image keys

      let answers = JSON.parse(req.body.checklistResponses);

      let outletExistsId = await Promise.resolve(
        checkOutletExists(answers.tenantid)
      ); // Step 3

      if (outletExistsId === -1) {
        return res.status(400).send({
          error: "Please enter integer ID",
        });
      } else if (outletExistsId === 0) {
        return res.status(404).send({
          error: "Invalid ID",
        });
      }

      let reportedDate = new Date(req.body.date);
      let resolveByDate = new Date(answers.resolveBy);

      let reportObject = {
        AuditorId: parseInt(req.body.auditorId),
        OutletId: parseInt(answers.tenantid),
        Score: parseInt(req.body.score),
        CreatedOn: reportedDate,
        ReportType: parseInt(req.body.checklistTypeId),
        ChecklistAnswers: JSON.stringify(answers.checklistResponses),
        Comments: answers.comments != null ? answers.comments : "",
      };

      let newReportId = await Promise.resolve(insertReport(reportObject)); // Step 4
      if (newReportId < 1) return res.sendStatus(500);

      if (vals.length > 0) {
        let savedImageIds = await Promise.resolve(
          saveImages(vals, req.body.date)
        ); // Step 2
        let mappedIdsCount = await Promise.resolve(
          mapImageIds(newReportId, savedImageIds)
        ); // Step 5
        if (mappedIdsCount < 1) return res.sendStatus(500);
      }

      if (parseInt(req.body.score) < passingScore) {
        let newNonComplianceId = await Promise.resolve(
          addNonComplianceRecord(newReportId, reportedDate, resolveByDate)
        );
        console.log(newNonComplianceId);
      }

      return res.sendStatus(200);
    })
    .catch((err) =>
      res.status(500).send({
        error: err,
      })
    );
};

// Save image ids into database
const saveImages = (keys, uploadDate) => {
  let insertValues = [];

  keys.forEach((key) => {
    insertValues.push({
      ImageKey: key,
      UploadedOn: new Date(uploadDate),
    });
  });

  let insertKeys = sql
    .insert("Images", insertValues)
    .returning("ImageId")
    .toParams();

  let insertPromise = new Promise((resolve) => {
    pool.query(insertKeys.text, insertKeys.values, (err, result) => {
      if (err) return resolve([]);
      else {
        return resolve(result.rows);
      }
    });
  });

  return insertPromise;
};

// Check if retail outlet exists in database
const checkOutletExists = (outletId) => {
  let checkOutletQuery = sql
    .select("COUNT(*)")
    .from("RetailOutlets")
    .where({ OutletId: outletId })
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      checkOutletQuery.text,
      checkOutletQuery.values,
      (err, result) => {
        if (err) return resolve(-1);
        else {
          return resolve(parseInt(result.rows[0].count));
        }
      }
    );
  });
};

// Insert report contents into database
const insertReport = (insertObject) => {
  let insertReportQuery = sql
    .insert("Reports", insertObject)
    .returning("ReportId")
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      insertReportQuery.text,
      insertReportQuery.values,
      (err, results) => {
        if (err) {
          console.error(err);
          return resolve(-1);
        } else {
          return resolve(parseInt(results.rows[0].ReportId));
        }
      }
    );
  });
};

// Map report id to image ids
const mapImageIds = (reportId, imageKeyObjects) => {
  let mapValues = imageKeyObjects.map((object) => {
    return {
      ReportId: reportId,
      ImageId: object.ImageId,
    };
  });
  let mapImageIdsQuery = sql
    .insert("ReportImages", mapValues)
    .returning("*")
    .toParams();
  return new Promise((resolve) => {
    pool.query(
      mapImageIdsQuery.text,
      mapImageIdsQuery.values,
      (err, results) => {
        if (err) {
          console.error(err);
          return resolve(-1);
        } else return resolve(results.rows.length);
      }
    );
  });
};

const addNonComplianceRecord = (reportId, reportDate, resolveByDate) => {
  let addRecordValues = {
    OriginalReportId: reportId,
    ReportedDate: reportDate,
    ResolveByDate: resolveByDate,
    IsResolved: false,
  };
  let addRecordQuery = sql
    .insert("NonComplianceLog", addRecordValues)
    .returning("NonComplianceId")
    .toParams();
  return new Promise((resolve) => {
    pool.query(addRecordQuery.text, addRecordQuery.values, (err, results) => {
      if (err) {
        console.error(err);
        return resolve(0);
      } else {
        let newRecordId = results.rows[0].NonComplianceId;
        return resolve(parseInt(newRecordId));
      }
    });
  });
};

const getChecklistTypes = (req, res) => {
  let getTypesQuery = sql.select().from("ChecklistTypes").toParams();

  pool.query(getTypesQuery.text, getTypesQuery.values, (err, result) => {
    if (err) {
      return res.status(500).send({
        error: err,
      });
    }

    return res.status(200).send(result.rows);
  });
};

// Test getting image url
const getImageUrl = async (req, res) => {
  const key = `${imageFolders.test}/${req.body.name}`;

  const url = await Promise.resolve(awsServices.getSignedUrl(key));
  console.log(url);
  res.status(200).send({
    signedUrl: url,
  });
};

const getImage = async (req, res) => {
  const key = `${imageFolders.test}/${req.body.name}`;

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
  let checklistTypeId = parseInt(req.params.typeId);

  // select * from getChecklistQuestions(checklistType integer)
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
  createAuditReport,
  getChecklistTypes,
  getImageUrl,
  getImage,
  addDefaultQuestion,
  getChecklistQuestions,
  exportTenantReport,
};
