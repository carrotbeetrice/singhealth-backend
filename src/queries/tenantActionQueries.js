/**
 * Workflow for tenant actions:
 * 1) Get tenantId from local storage in front end, send GET request w/tenantId
 * 2) Check database for any unresolved non-compliances
 * 3) If no non-compliances, return empty array. Else return all unresolved non-compliances with info:
 *  - Noncompliance Id
 *  - Auditor name
 *  - Rectification deadline
 *  - Report type
 * 4) After clicking 'Rectification Needed', send another GET request w/noncompliance Id
 * 5) Retrieve all non-compliance image URLs + the details from (3) for the noncompliance
 * 6) Tenant sends back rectification report. Just repeat whatever you did for the audit checklist
 */

const awsServices = require("../services/aws/awsServices");
const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const excel = require("exceljs");
const pool = db.getPool();

let rectifcationImageFolder = "rectifications";

const getUnresolvedNCs = (req, res) => {
  let tenantId = parseInt(req.params.tenantId);

  let query = sql.select().from(`getunresolvedncs(${tenantId})`).toParams();

  pool.query(query.text, query.values, (err, result) => {
    if (err) res.status(500).send({ error: err });
    else
      res.status(200).send({
        data: result.rows,
      });
  });
};

const getNCReport = async (req, res) => {
  let ncId = parseInt(req.params.ncId);

  let reportId = await Promise.resolve(getOriginalReportId(ncId));
  if (reportId == null) return res.sendStatus(500);

  let reportImageKeys = await Promise.resolve(getReportImageKeys(reportId));
  let imageUrls = await Promise.all(getSignedUrlArray(reportImageKeys));
  let reportInfo = await Promise.resolve(getReportInfo(reportId));

  if (reportInfo.comments === "") reportInfo.comments = null;

  return res.status(200).send({
    ncId: ncId,
    reportInfo: reportInfo,
    reportImageUrls: imageUrls,
  });
};

const getOriginalReportId = (ncId) => {
  let getReportId = sql
    .select("OriginalReportId")
    .from("NonComplianceLog")
    .where({ NonComplianceId: ncId })
    .toParams();

  return new Promise((resolve) => {
    pool.query(getReportId.text, getReportId.values, (err, results) => {
      if (err) {
        return resolve(null);
      } else {
        return resolve(results.rows[0].OriginalReportId);
      }
    });
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

const getReportImages = (req, res) => {
  let reportId = 4;

  let getReportImagesQuery = sql
    .select('array_agg("ImageKey")')
    .from("Images")
    .innerJoin("ReportImages")
    .on("Images.ImageId", "ReportImages.ImageId")
    .where({ ReportId: reportId })
    .toParams();

  pool.query(
    getReportImagesQuery.text,
    getReportImagesQuery.values,
    (err, results) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500);
      } else {
        return res.status(200).send(results.rows[0].array_agg);
      }
    }
  );
};

const getSignedUrlArray = (imageKeys) => {
  let promiseArray = [];

  imageKeys.forEach((key) => {
    let promise = awsServices.getSignedUrl(key);
    promiseArray.push(promise);
  });

  return promiseArray;
};

const getReportInfo = (reportId) => {
  let getReportQuery = sql.select().from(`getncreport(${reportId})`).toParams();

  return new Promise((resolve) => {
    pool.query(getReportQuery.text, getReportQuery.values, (err, results) => {
      if (err) return resolve({});
      else return resolve(results.rows[0]);
    });
  });
};

/**
 * Assume request body has similar as the checklist form and contains:
 * - original non-compliance id
 * - rectification images
 * - submission date/timestamps
 * - comments by tenant, if any
 *
 * Steps:
 * 1) Update NonComplianceLog to indicate rectification return number of modified rows
 * 2) Upload images to S3 bucket and return image keys
 * 3) Save image keys into database, return primary keys of newly inserted image records
 * 4) Add rectification record, return newly inserted record id
 * 5) Map rectfication id to image records, if any
 */
const submitRectification = async (req, res) => {
  try {
    let ncId = parseInt(req.body.ncId);
    let comments = req.body.notes;
    let submittedOn = req.body.submittedOn;

    let updatedNCRecord = await Promise.resolve(updateNCLog(ncId, submittedOn)); // Step 1
    if (updatedNCRecord == 0) {
      return res.status(500).send({
        error: "Error saving submission",
      });
    }

    let uploadPromiseArray = awsServices.multipleUpload(
      rectifcationImageFolder,
      req.files
    ); // Step 2
    let imageKeys = await Promise.all(uploadPromiseArray);
    // console.log(imageKeys);

    let newRectificationRecord = await Promise.resolve(
      addRectificationRecord(ncId, comments)
    ); // Step 4
    if (newRectificationRecord == 0) {
      return res.status(500).send({
        error: "Error saving submission",
      });
    }

    if (imageKeys.length > 0) {
      let savedImageIds = await Promise.resolve(
        saveImages(imageKeys, submittedOn)
      ); // Step 3
      let mappedIdsCount = await Promise.resolve(
        mapImageIds(newRectificationRecord, savedImageIds)
      );
      if (mappedIdsCount < 1) return res.sendStatus(500);
    }

    return res.sendStatus(200);
  } catch (error) {
    return res.status(500).send({ error: error });
  }
};

const updateNCLog = (ncId, submittedOn) => {
  let updateQuery = sql
    .update("NonComplianceLog")
    .set({
      IsResolved: true,
      ResolvedOn: new Date(submittedOn),
    })
    .where({
      NonComplianceId: ncId,
    })
    .returning("NonComplianceId")
    .toParams();

  return new Promise((resolve) => {
    pool.query(updateQuery.text, updateQuery.values, (err, result) => {
      if (err) return resolve(0);
      else {
        let updatedRecordId = result.rows[0].NonComplianceId;
        if (updatedRecordId != null) return resolve(parseInt(updatedRecordId));
        else return resolve(0);
      }
    });
  });
};

const addRectificationRecord = (ncId, comments) => {
  let addRecordValues = {
    NonComplianceId: ncId,
    Comments: comments,
  };

  let newRRQuery = sql
    .insert("RectificationLog", addRecordValues)
    .returning("RectificationId")
    .toParams();

  return new Promise((resolve) => {
    pool.query(newRRQuery.text, newRRQuery.values, (err, result) => {
      if (err) return resolve(0);
      else {
        let newRecordId = result.rows[0].RectificationId;
        return resolve(parseInt(newRecordId));
      }
    });
  });
};

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

  return new Promise((resolve) => {
    pool.query(insertKeys.text, insertKeys.values, (err, result) => {
      if (err) return resolve([]);
      else return resolve(result.rows);
    });
  });
};

const mapImageIds = (rectificationId, imageKeyObjs) => {
  let mapValues = imageKeyObjs.map((object) => {
    return {
      RectificationId: rectificationId,
      ImageId: object.ImageId,
    };
  });
  let mapIdsQuery = sql
    .insert("RectificationImages", mapValues)
    .returning("*")
    .toParams();

  return new Promise((resolve) => {
    pool.query(mapIdsQuery.text, mapIdsQuery.values, (err, results) => {
      if (err) return resolve(-1);
      else return resolve(results.rows.length);
    });
  });
};

module.exports = {
  getUnresolvedNCs,
  getReportImages,
  getNCReport,
  submitRectification,
};
