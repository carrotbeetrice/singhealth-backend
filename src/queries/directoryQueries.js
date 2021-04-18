const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const _ = require("underscore");
const e = require("express");
const pool = db.getPool();

// This is getting tedious damn it
const tenantRoleId = 2;

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
  let getOutletsQuery = sql
    .select()
    .from("getAllOutlets()")
    .orderBy("outletid")
    .toParams();

  pool.query(getOutletsQuery.text, getOutletsQuery.values, (err, results) => {
    if (err) {
      return res.status(400).send({
        message: err,
      });
    }

    return res.status(200).send(results.rows);
  });
};

const addOutlet = (req, res) => {
  // Check if tenant exists
  let checkTenantQuery = sql
    .select("UserId")
    .from("Users")
    .where({ Email: req.body.email, RoleId: tenantRoleId })
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

      if (tenantCheckResults.rows.length === 0) {
        return res.status(400).send({
          status: 400,
          error: "Tenant does not exist",
        });
      }

      let submittedTenantId = tenantCheckResults.rows[0].UserId;

      let tableInsertValues = {
        OutletName: req.body.outletname,
        TenantId: submittedTenantId,
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
  let checkTenantQuery = sql
    .select("UserId")
    .from("Users")
    .where({
      Email: req.body.email,
      RoleId: tenantRoleId,
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

      if (tenantCheckResults.rows.length === 0) {
        return res.status(400).send({
          status: 400,
          error: "Tenant does not exist",
        });
      }

      let submittedTenantId = tenantCheckResults.rows[0].UserId;

      let tableUpdateValues = {
        // OutletId: req.body.outletid,
        OutletName: req.body.outletname,
        TenantId: submittedTenantId,
        UnitNumber: req.body.unitnumber,
        TenancyStart: formatDate(req.body.tenancystart),
        TenancyEnd: formatDate(req.body.tenancyend),
        InstitutionId: req.body.institutionid,
        OutletType: parseInt(req.body.outlettypeid),
      };

      let updateOutletQuery = sql
        .update("RetailOutlets", tableUpdateValues)
        .where({ OutletId: req.body.outletid })
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

module.exports = {
  getOutletTypes,
  getAllOutlets,
  addOutlet,
  updateOutlet,
  deleteOutlet,
};
