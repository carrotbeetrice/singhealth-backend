const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const pool = db.getPool();

const getDashboardData = async (req, res) => {
  let auditorId = parseInt(req.params.auditorId);

  let monthlyAverageWithIncrease = await getMonthlyAverageWithIncrease(
    auditorId,
    res
  );
  let unresolvedNCs = await Promise.resolve(getNCPercentage(auditorId));
  let ncRecords = await Promise.resolve(getNCRecords(auditorId));

  let pageData = {
    monthlyAverageData: monthlyAverageWithIncrease,
    unresolvedNCs: unresolvedNCs,
    nonComplianceRecords: ncRecords,
  };
  // console.log(pageData);

  res.status(200).send(pageData);
};

//TODO: Change the db function to return no. of non-compliances instead of average scores
const getMonthlyAverageWithIncrease = async (auditorId, res) => {
  let results = await Promise.resolve(getMonthlyAverageScores(auditorId));
  let currentMonthAverage, previousMonthAverage;

  if (results[1].year > results[0].year) {
    currentMonthAverage = results[1].monthlyaverage;
    previousMonthAverage = results[0].monthlyaverage;
  } else if (results[1].month > results[0].month) {
    currentMonthAverage = results[1].monthlyaverage;
    previousMonthAverage = results[0].monthlyaverage;
  } else {
    currentMonthAverage = results[0].monthlyaverage;
    previousMonthAverage = results[1].monthlyaverage;
  }

  let monthlyAverageData = {
    currentAverage: parseFloat(currentMonthAverage).toFixed(2),
    change: (
      parseFloat(currentMonthAverage) - parseFloat(previousMonthAverage)
    ).toFixed(2),
  };

  return monthlyAverageData;
};

const getMonthlyAverageScores = (auditorId) => {
  let getAveragesQuery = sql
    .select()
    .from(`getMonthlyAverages(${auditorId})`)
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getAveragesQuery.text,
      getAveragesQuery.values,
      (err, result) => {
        if (err) {
          console.error(err);
          return resolve([]);
        } else return resolve(result.rows);
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

module.exports = {
  getDashboardData,
};
