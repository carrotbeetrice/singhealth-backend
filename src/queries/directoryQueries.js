const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const pool = db.getPool();

// Reformat date string
const formatDate = (rawDateString) => {
  let date = new Date(rawDateString);
  return date;
};

const getOutletTypes = (req, res) => {
  let getTypesQuery = sql.select().from("OutletTypes").toParams();
  pool.query(getTypesQuery.text, getTypesQuery.values, (err, results) => {
    var status = 200;
    if (err) {
      status = 400;
      return res.status(status).send({
        status: status,
        error: err,
      });
    } else {
      return res.status(status).send({
        status: status,
        data: results.rows,
      });
    }
  });
};

const getAllOutlets = (req, res) => {
  let auditorId = parseInt(req.params.auditorId);

  Promise.resolve(getStaffInstitution(auditorId))
    .then((institutionInfo) => {
      let getOutletsQuery = sql
        .select()
        .from(`getAllOutlets(${institutionInfo.id})`)
        .orderBy("outletid")
        .toParams();

      pool.query(
        getOutletsQuery.text,
        getOutletsQuery.values,
        (err, results) => {
          if (err) throw err;
          else
            res.status(200).send({
              outletRecords: results.rows,
              institutionInfo: institutionInfo,
            });
        }
      );
    })
    .catch(() => res.sendStatus(500));
};

const addOutlet = (req, res) => {
  // Check if tenant exists
  const tenantId = parseInt(req.body.tenantid);

  let checkTenantQuery = sql
    .select("count(*)")
    .from("Users")
    .where({ UserId: tenantId })
    .toParams();

  pool.query(
    checkTenantQuery.text,
    checkTenantQuery.values,
    (err, tenantCheckResults) => {
      if (err) {
        console.error(err);
        return res.status(500).send({
          status: 500,
          error: err,
        });
      }

      if (tenantCheckResults.rows[0].count == 0) {
        return res.status(400).send({
          status: 400,
          error: "Tenant does not exist",
        });
      }

      let tableInsertValues = {
        OutletName: req.body.outletname,
        TenantId: tenantId,
        UnitNumber: req.body.unitnumber,
        TenancyStart: formatDate(req.body.tenancystart),
        TenancyEnd: formatDate(req.body.tenancyend),
        InstitutionId: req.body.institutionid,
        OutletType: parseInt(req.body.outlettypeid),
      };

      let insertOutletQuery = sql
        .insert("RetailOutlets", tableInsertValues)
        .toParams();

      pool.query(
        insertOutletQuery.text,
        insertOutletQuery.values,
        (err, insertQueryResults) => {
          if (err) {
            console.error(err);
            return res.status(500).send({
              status: 500,
              error: err,
            });
          } else {
            return res.status(200).send({
              status: 200,
              message: "All good bois",
            });
          }
        }
      );
    }
  );
};

const updateOutlet = (req, res) => {
  // Check if given tenant exists
  const tenantId = parseInt(req.body.tenantid);
  let checkTenantQuery = sql
    .select("count(*)")
    .from("Users")
    .where({
      UserId: tenantId,
    })
    .toParams();

  pool.query(
    checkTenantQuery.text,
    checkTenantQuery.values,
    (err, tenantCheckResults) => {
      if (err) {
        return res.status(500).send({
          status: 500,
          error: err,
        });
      }

      if (tenantCheckResults.rows[0].count === 0) {
        return res.status(400).send({
          status: 400,
          error: "Tenant does not exist",
        });
      }

      let tableUpdateValues = {
        OutletName: req.body.outletname,
        TenantId: tenantId,
        UnitNumber: req.body.unitnumber,
        TenancyStart: formatDate(req.body.tenancystart),
        TenancyEnd: formatDate(req.body.tenancyend),
        InstitutionId: req.body.institutionid,
        OutletType: parseInt(req.body.outlettypeid),
      };

      let updateOutletQuery = sql
        .update("RetailOutlets", tableUpdateValues)
        .where({ OutletId: req.body.outletid })
        .returning("OutletId")
        .toParams();

      pool.query(
        updateOutletQuery.text,
        updateOutletQuery.values,
        (err, updateQueryResults) => {
          if (err) {
            console.error(err);
            return res.status(500).send({
              status: 500,
              error: err,
            });
          } else {
            let updatedRecord = parseInt(updateQueryResults.rows[0].OutletId);
            if (updatedRecord != null) {
              return res.status(200).send({
                status: 200,
                message: "All good bois",
              });
            } else
              return res.status(500).send({
                status: 500,
                error: "What",
              });
          }
        }
      );
    }
  );
};

const deleteOutlet = (req, res) => {
  let deleteOutletQuery = sql
    .delete("RetailOutlets")
    .where({
      OutletId: parseInt(req.body.outletid),
    })
    .toParams();

  pool.query(
    deleteOutletQuery.text,
    deleteOutletQuery.values,
    (err, results) => {
      if (err) {
        return res.status(500).send({
          status: 500,
          error: err,
        });
      } else {
        return res.status(200).send({
          status: 200,
          result: "Outlet successfully deleted",
        });
      }
    }
  );
};

const getStaffInstitution = (staffId) => {
  let getStaffInstitutionQuery = sql
    .select(["institutionid as Id", "InstitutionName as Name"])
    .from("StaffInstitutions")
    .innerJoin("Institutions")
    .on("InstitutionId", "institutionid")
    .where({ staffid: staffId })
    .toParams();

  return new Promise((resolve) => {
    pool.query(
      getStaffInstitutionQuery.text,
      getStaffInstitutionQuery.values,
      (err, results) => {
        if (err) return resolve(0);
        else return resolve(results.rows[0]);
      }
    );
  });
};

module.exports = {
  getOutletTypes,
  getAllOutlets,
  addOutlet,
  updateOutlet,
  deleteOutlet,
};
