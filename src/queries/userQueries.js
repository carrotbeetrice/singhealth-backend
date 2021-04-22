const db = require("../pgpool");
const sql = require("sql-bricks-postgres");
const _ = require("underscore");
const bcrypt = require("bcrypt");
const pool = db.getPool();

const tenantRoleId = 2;
const auditorRoleId = 1;
const saltRounds = 10;

const getTenants = (req, res) => {
  const staffId = parseInt(req.params.auditorId);

  Promise.resolve(getStaffInstitution(staffId))
    .then((staffInstitutionInfo) => {
      let getTenantsQuery = sql
        .select(["TenantId", "UserName as Name", "Email"])
        .distinct()
        .from("RetailOutlets")
        .innerJoin("Users")
        .on("UserId", "TenantId")
        .where({ InstitutionId: staffInstitutionInfo.id })
        .toParams();

      pool.query(
        getTenantsQuery.text,
        getTenantsQuery.values,
        (err, results) => {
          if (err) throw err;
          else
            res.status(200).send({
              tenantRecords: results.rows,
              institutionInfo: staffInstitutionInfo,
            });
        }
      );
    })
    .catch(() => res.sendStatus(500));
};

const getAllSHTenants = (req, res) => {
  return userQueryByRole(tenantRoleId, req, res);
};

const getAuditors = (req, res) => {
  userQueryByRole(auditorRoleId, req, res);
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

const getInstitutions = (req, res) => {
  let getInstitutionsQuery = sql
    .select(["InstitutionId", "InstitutionName"])
    .from("Institutions")
    .orderBy("InstitutionId")
    .toParams();
  pool.query(
    getInstitutionsQuery.text,
    getInstitutionsQuery.values,
    (err, results) => {
      if (err) {
        return res.status(400).send({
          message: "GET /institutions failed",
        });
      }
      return res.status(200).json({
        status: 200,
        institutions: results.rows,
      });
    }
  );
};

const createAuditor = (req, res) => {
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (err) return res.status(400).send(err);

    var tableInsert = {
      UserName: req.body.name,
      Hash: hash,
      Email: req.body.email,
      RoleId: auditorRoleId,
    };

    const insertQuery = sql
      .insert("Users", _.keys(tableInsert))
      .select()
      .from(sql.values(tableInsert).as("v").columns().types())
      .where(
        sql.not(
          sql.exists(
            sql.select("Email").from("Users").where({ Email: req.body.email })
          )
        )
      )
      .toParams();

    pool.query(insertQuery.text, insertQuery.values, (err, results) => {
      if (err) {
        throw err;
      } else {
        return res.status(201).send({
          message: "Auditor creation successful",
          user: results.rows[0],
        });
      }
    });
  });
};

const createTenant = (req, res) => {
  console.log(req.body);
  bcrypt.hash(req.body.Password, saltRounds, (err, hash) => {
    if (err) return res.status(400).send(err);

    var tableInsert = {
      UserName: req.body.name,
      Hash: hash,
      Email: req.body.Email,
      RoleId: tenantRoleId,
    };

    const insertQuery = sql
      .insert("Users", _.keys(tableInsert))
      .select()
      .from(sql.values(tableInsert).as("v").columns().types())
      .where(
        sql.not(
          sql.exists(
            sql.select("Email").from("Users").where({ Email: req.body.Email })
          )
        )
      )
      .toParams();

    pool.query(insertQuery.text, insertQuery.values, (err, results) => {
      if (err) {
        throw err;
      } else {
        return res.status(201).send({
          message: "Tenant creation successful",
          user: results.rows[0],
        });
      }
    });
  });
};

const deleteTenant = (req, res) => {
  let deleteQuery = sql
    .delete("Users")
    .where({ UserId: req.body.UserId })
    .toParams();

  pool.query(deleteQuery.text, deleteQuery.values, (err, results) => {
    if (err) return res.status(400).json(err);
    return res.send({
      message: "Tenant deleted",
    });
  });
};

/*
    Query functions
*/

const userQueryByRole = (role, req, res) => {
  let getUsersQuery = sql
    .select(["UserId", "UserName", "Email"])
    .from("Users")
    .where({ RoleId: role })
    .orderBy("UserId")
    .toParams();
  return pool.query(
    getUsersQuery.text,
    getUsersQuery.values,
    (err, results) => {
      if (err) return res.status(400).json(err);
      else
        return res.status(200).send({
          status: 200,
          data: results.rows,
        });
    }
  );
};

module.exports = {
  getTenants,
  getAuditors,
  getInstitutions,
  createAuditor,
  createTenant,
  deleteTenant,
  getAllSHTenants,
};
