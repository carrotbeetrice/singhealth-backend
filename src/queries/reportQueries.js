const awsServices = require("../services/aws/awsServices");
const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const excel = require("exceljs");
const pool = db.getPool();
const email = require("../services/email/sendEmail");

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
const imageFolders = {
  test: "cats",
  nonCompliances: "non_compliances",
  rectifications: "rectifications",
};
const passingScore = 95;

/*
Steps:
1) Check if tenant ID exists in database, send error response if not exists
2) Upload images to S3 bucket and return image keys
3) Save image keys into database, return primary keys of newly inserted image records
4) Save report info into database, return newly inserted report id
5) Map report id to image records, if any
6) If score is below 95%, add non-compliance record
 */
const createAuditReport = async (req, res) => {
  let answers = JSON.parse(req.body.checklistResponses);

  let outletExistsId = await Promise.resolve(
    checkOutletExists(answers.tenantid)
  ); // Step 1

  if (outletExistsId === -1) {
    return res.status(400).send({
      error: "Please enter integer ID",
    });
  } else if (outletExistsId === 0) {
    return res.status(404).send({
      error: "Invalid ID",
    });
  }

  let promiseArray = awsServices.multipleUpload(
    imageFolders.nonCompliances,
    req.files
  ); // Step 2

  Promise.all(promiseArray)
    .then(async (vals) => {
      // vals is the array of uploaded image keys

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
        ); // Step 3
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

// Get checklist options
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

// Get questions based on checklist type selected
const getChecklistQuestions = (req, res) => {
  let checklistTypeId = parseInt(req.params.typeId);

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
  writeTenantReport(req, res)
    .then((reportFile) => {
      setExcelResponseHeaders(res, reportFile.fileName);
      res.status(200).send(reportFile.buffer);
    })
    .catch(() => res.sendStatus(500));
};

// Send report to tenant
const emailToTenant = (req, res) => {
  let reportId = parseInt(req.params.reportId);
  writeTenantReport(req, res)
  .then((reportFile) => 
    getReceiverInfo(reportId).then((receiverInfo) => 
      email.sendTenantReport(receiverInfo, reportFile, res)
    )
    .catch((err) => {
      throw err;
    })
  )
  .catch(() => res.sendStatus(500));
};

// Get receiver information
const getReceiverInfo = (reportId) => {
  // select * from getReceiverInfo(4);
  let getInfoQuery = sql
    .select()
    .from(`getReceiverInfo(${reportId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(getInfoQuery.text, getInfoQuery.values, (err, results) => {
      if (err) throw err;
      else return resolve(results.rows[0]);
    });
  });
};

// Export report to excel file and return file buffer + filename
const writeTenantReport = async (req, res) => {
  let reportId = parseInt(req.params.reportId);

  // Get full report from database
  const reportData = await Promise.resolve(getFullTenantReport(reportId));
  if (reportData === {}) {
    return res.status(500).send({
      error: "Error exporting report",
    });
  }
  // console.log(reportData);

  // Retrieve image keys from database and download images from AWS S3 bucket
  const imageKeys = await Promise.resolve(getReportImageKeys(reportId));
  let promiseArray = awsServices.getMultipleImages(imageKeys);
  let reportImagesArray = await Promise.all(promiseArray);

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

  // Generate filename
  let fileName = `${reportData.reportid}_${
    reportData.reportedon
  }_${Date.now()}.xlsx`;

  populateReportChecklist(
    reportContentsWorksheet,
    reportData.checklistcontents
  );
  addImageToWorksheet(workbook, reportContentsWorksheet, reportImagesArray);

  const reportBuffer = await Promise.resolve(workbook.xlsx.writeBuffer());
  return {
    fileName: fileName,
    buffer: reportBuffer,
  };
};

const getFullTenantReport = (reportId) => {
  const getFullReportQuery = sql
    .select()
    .from(`getFullTenantReport(${reportId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getFullReportQuery.text,
      getFullReportQuery.values,
      (err, results) => {
        if (err) {
          console.log(err);
          return resolve({});
        } else return resolve(results.rows[0]);
      }
    );
  });
};

const getReportImageKeys = (reportId) => {
  let getImageKeysQuery = sql
    .select('array_agg("ImageKey")')
    .from("Images")
    .innerJoin("ReportImages")
    .on("Images.ImageId", "ReportImages.ImageId")
    .where({ ReportId: reportId })
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getImageKeysQuery.text,
      getImageKeysQuery.values,
      (err, results) => {
        if (err) {
          console.error(err);
          return resolve([]);
        } else {
          let imageKeys = results.rows[0].array_agg;

          if (imageKeys != null) {
            return resolve(imageKeys);
          } else return resolve([]);
        }
      }
    );
  });
};

const populateReportChecklist = (worksheet, checklistContents) => {
  checklistContents.forEach((category) => {
    worksheet.addRow({ question: category.categoryName }, "bold");
    category.questions.forEach((item) => {
      worksheet.addRow({
        question: item.question,
        answer: mapResponse(item.value),
      });
    });
  });
};

const mapResponse = (answer) => {
  let value = parseInt(answer);

  if (value === 0) value = "Yes";
  else if (value === 1) value = "No";
  else value = "NA";

  return value;
};

const setExcelResponseHeaders = (res, fileName) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=" + fileName);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
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

// Test getting image url - DEVELOPMENT ONLY
const getImageUrl = async (req, res) => {
  const key = req.body.key;

  const url = await Promise.resolve(awsServices.getSignedUrl(key));
  // console.log(url);
  res.status(200).send({
    signedUrl: url,
  });
};

// Test getting image - DEVELOPMENT ONLY
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

module.exports = {
  createAuditReport,
  getChecklistTypes,
  getImageUrl,
  getImage,
  addDefaultQuestion,
  getChecklistQuestions,
  exportTenantReport,
  emailToTenant,
};
