const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const pool = db.getPool();

//tenant side data
//get tenant outstanding nc
const getTenantOutlets = (userId) => {
  let getTenantOutletsQuery = sql
    .select("OutletId")
    .from("RetailOutlets")
    .where({TenantId: userId})
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getTenantOutletsQuery.text,
      getTenantOutletsQuery.values,
      (err, results) => {
        if (err) return resolve([]);
        else return resolve(results.rows);
      }
    );
  });
}

const getTenantReports = async (userId) => {
  let tenantOutlets = await Promise.resolve(getTenantOutlets(userId));
  console.log(tenantOutlets);
  let getTenantReportsQuery = sql
    .select("ReportId")
    .from("Reports")
    .where(sql.or(tenantOutlets.map(({OutletId}) => ({OutletId:OutletId}))))
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getTenantReportsQuery.text,
      getTenantReportsQuery.values,
      (err, results) => {
        if (err) return resolve([]);
        else return resolve(results.rows);
      }
    );
  });
}
//get tenant latest score
const getTenantLatestScore = async (userId) => {
  let tenantOutlets = await Promise.resolve(getTenantOutlets(userId));
  let getTenantLatestScoreQuery = sql
    .select("Score")
    .from("Reports")
    .where(sql.or(tenantOutlets.map(({OutletId}) => ({OutletId:OutletId}))))
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getTenantLatestScoreQuery.text,
      getTenantLatestScoreQuery.values,
      (err, results) => {
        if (err) return resolve([]);
        else return resolve(results.rows);
      }
    );
  });
}
//get tenant past scores
//get tenant pending and unresolved cases

//audit side data
const getDashboardData = async (req, res) => {
  console.log(req.params);
  // req.params.auditorId = req.params.userId;
  const userId = parseInt(req.params.userId);
  
  const unresolvedNCs = await Promise.resolve(getNCPercentage(userId));
  const ncRecords = await Promise.resolve(getNCRecords(userId));
  const ncCount = await Promise.resolve(getNCCount(userId));
  const auditorInstitution = await Promise.resolve(
    getAuditorInstitution(userId)
  );
  const outletScores = await Promise.resolve(getOutletScores(userId));
  
  
  const tenantNC = await Promise.resolve(getTenantOutlets(userId));
  const tenantReports = await Promise.resolve(getTenantReports(userId));
  const tenantLatestScore = await Promise.resolve(getTenantLatestScore(userId));

  
  const currentDate = new Date().toISOString().slice(0, 10);
  const monthlyScoresByReportType = await Promise.resolve(calculateMonthlyAverages(userId, currentDate));

  const pageData = {
    unresolvedNCs: unresolvedNCs,
    nonComplianceRecords: ncRecords,
    ncCount: ncCount,
    institution: auditorInstitution.InstitutionName,
    outletScores: outletScores,
    monthlyScoresByType: monthlyScoresByReportType,
    tenantNC: tenantNC,
    tenantReports: tenantReports,
    tenantLatestScore: tenantLatestScore
  };
  console.log("**********");
  console.log(pageData);
  console.log("**********");
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
