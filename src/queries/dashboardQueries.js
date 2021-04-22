const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const pool = db.getPool();

const getDashboardData = async (req, res) => {
  const auditorId = parseInt(req.params.auditorId);

  // const monthlyAverageWithIncrease = await getMonthlyAverageWithIncrease(
  //   auditorId,
  //   res
  // );
  const unresolvedNCs = await Promise.resolve(getNCPercentage(auditorId));
  const ncRecords = await Promise.resolve(getNCRecords(auditorId));
  const ncCount = await Promise.resolve(getNCCount(auditorId));
  const auditorInstitution = await Promise.resolve(
    getAuditorInstitution(auditorId)
  );
  const outletScores = await Promise.resolve(getOutletScores(auditorId));

  const currentDate = new Date().toISOString().slice(0, 10);
  const montlyScoresByReportType = await Promise.resolve(calculateMonthlyAverages(auditorId, currentDate));

  const pageData = {
    // monthlyAverageData: monthlyAverageWithIncrease,
    unresolvedNCs: unresolvedNCs,
    nonComplianceRecords: ncRecords,
    ncCount: ncCount,
    institution: auditorInstitution.InstitutionName,
    outletScores: outletScores,
    monthlyScoresByType: montlyScoresByReportType,
  };

  res.status(200).send(pageData);
};

const getOutletScores = (auditorId) => {
  let getScoresQuery = sql
    .select()
    .from(`getinstitutionscores(${auditorId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(getScoresQuery.text, getScoresQuery.values, (err, results) => {
      if (err) {
        console.error(err);
        return resolve([]);
      } else return resolve(results.rows);
    });
  });
};

// const getMonthlyAverageWithIncrease = async (auditorId, res) => {
//   let results = await Promise.resolve(getMonthlyAverageScores(auditorId));
//   let currentMonthAverage, previousMonthAverage;

//   if (results[1].year > results[0].year) {
//     currentMonthAverage = results[1].monthlyaverage;
//     previousMonthAverage = results[0].monthlyaverage;
//   } else if (results[1].month > results[0].month) {
//     currentMonthAverage = results[1].monthlyaverage;
//     previousMonthAverage = results[0].monthlyaverage;
//   } else {
//     currentMonthAverage = results[0].monthlyaverage;
//     previousMonthAverage = results[1].monthlyaverage;
//   }

//   let monthlyAverageData = {
//     currentAverage: parseFloat(currentMonthAverage).toFixed(2),
//     change: (
//       parseFloat(currentMonthAverage) - parseFloat(previousMonthAverage)
//     ).toFixed(2),
//   };

//   return monthlyAverageData;
// };

const calculateMonthlyAverages = async (auditorId, dateRange) => {
  let scoresByReportType = await Promise.resolve(
    getMonthlyScoresByReportType(auditorId, dateRange)
  );

  let monthlyScoresByType = [];

  scoresByReportType.forEach((scoreObject) => {
    let monthlyAverageObject = {
      typeId: scoreObject.typeid,
      reportType: scoreObject.reporttype,
      average: 0,
    };
    let n = scoreObject.scores.length;
    let totalScore = 0;

    scoreObject.scores.forEach((outletScore) => {
      totalScore += outletScore.score;
    });

    monthlyAverageObject.average = totalScore / n;
    monthlyScoresByType.push(monthlyAverageObject);
  });

  return monthlyScoresByType;
};

const getMonthlyScoresByReportType = (auditorId, dateRange) => {
  let getScoresByReport = sql
    .select()
    .from(`getmonthlyscoresbyreporttype(${auditorId}, '${dateRange}')`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getScoresByReport.text,
      getScoresByReport.values,
      (err, results) => {
        if (err) return resolve([]);
        else return resolve(results.rows);
      }
    );
  });
};

// const getMonthlyAverageScores = (auditorId) => {
//   let getAveragesQuery = sql
//     .select()
//     .from(`getMonthlyAverages(${auditorId})`)
//     .toParams();

//   return new Promise((resolve) => {
//     pool.query(
//       getAveragesQuery.text,
//       getAveragesQuery.values,
//       (err, result) => {
//         if (err) {
//           console.error(err);
//           return resolve([]);
//         } else return resolve(result.rows);
//       }
//     );
//   });
// };

const getNCPercentage = (auditorId) => {
  let getNCDataQuery = sql
    .select()
    .from(`getMonthlyNoncompliancesbyInstitution(${auditorId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(getNCDataQuery.text, getNCDataQuery.values, (err, results) => {
      if (err) {
        console.error(err);
        return resolve(0);
      } else {
        let nonComplianceData = results.rows[0];
        let unresolvedPercent =
          nonComplianceData.unresolvedcount /
          nonComplianceData.totalnoncompliances;
        return resolve(unresolvedPercent.toFixed(2));
      }
    });
  });
};

const getNCRecords = (auditorId) => {
  let getNCRecordsQuery = sql
    .select()
    .from(`getnoncompliancereportrecords(${auditorId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getNCRecordsQuery.text,
      getNCRecordsQuery.values,
      (err, results) => {
        if (err) {
          console.error(err);
          return resolve([]);
        } else {
          return resolve(results.rows);
        }
      }
    );
  });
};

const getNCCount = (auditorId) => {
  let getNCCountQuery = sql
    .select()
    .from(`getnccount(${auditorId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(getNCCountQuery.text, getNCCountQuery.values, (err, result) => {
      if (err) {
        console.error(err);
        return resolve({});
      } else {
        let lastTwoMonths = result.rows;
        console.log(lastTwoMonths);

        if (lastTwoMonths === []) return resolve({
          currentMonthCount: 0,
          percentageChange: 0,
        });

        let currentMonthCount = parseInt(lastTwoMonths[0].noncompliances);
        let previousMonthCount = parseInt(lastTwoMonths[1].noncompliances);

        // Calculate percentage change in non-compliance count
        let change =
          (100 * (currentMonthCount - previousMonthCount)) / previousMonthCount;

        return resolve({
          currentCount: currentMonthCount,
          percentageChange: change,
        });
      }
    });
  });
};

const getAuditorInstitution = (auditorId) => {
  let getInstitutionQuery = sql
    .select("InstitutionName")
    .from("StaffInstitutions")
    .innerJoin("Institutions")
    .on("StaffInstitutions.institutionid", "Institutions.InstitutionId")
    .where({ staffid: auditorId })
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getInstitutionQuery.text,
      getInstitutionQuery.values,
      (err, result) => {
        if (err) return resolve({});
        else return resolve(result.rows[0]);
      }
    );
  });
};

const getMonthlyOutletScores = (req, res) => {
  const { auditorId, month, year } = req.body;

  const dateRange = new Date(year, month).toISOString().slice(0, 10);

  const getMonthlyScoresQuery = sql
    .select()
    .from(`getoutletscoresbymonth(${parseInt(auditorId)}, '${dateRange}')`)
    .toParams();

  pool.query(
    getMonthlyScoresQuery.text,
    getMonthlyScoresQuery.values,
    (err, results) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500);
      } else return res.status(200).send(results.rows);
    }
  );
};

module.exports = {
  getDashboardData,
  getMonthlyOutletScores,
};
