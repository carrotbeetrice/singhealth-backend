const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const bcrypt = require('bcrypt');
const pool = db.getPool();
// const validateToken = require('../utils/jwtUtils').validateToken;

const tenantRoleId = 2;
const auditorRoleId = 1;
const saltRounds = 10;


const getTenants = (req, res) => {
    userQueryByRole(tenantRoleId, req, res);
};

const getAuditors = (req, res) => {
    userQueryByRole(auditorRoleId, req, res);
};

const getInstitutions = (req, res) => {
    console.log("getInstitutions called");
    let getInstitutionsQuery = sql.select(['InstitutionId', 'InstitutionName']).from('Institutions').orderBy('InstitutionId').toParams();
    pool.query(getInstitutionsQuery.text, getInstitutionsQuery.values, (err, results) => {
        if (err) {
            return res.status(400).send({
                message: "GET /institutions failed"
            });
        }
        return res.status(200).json({
            status: 200,
            institutions: results.rows
        });
    });
};

const createAuditor = (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        if (err) return res.status(400).send(err);

        var tableInsert = {
            UserName: req.body.name,
            Hash: hash,
            Email: req.body.email,
            RoleId: auditorRoleId
        };
    
        const insertQuery = sql.insert('Users', _.keys(tableInsert))
            .select().from(sql.values(tableInsert).as('v').columns().types())
            .where(sql.not(sql.exists(
                sql.select('Email').from('Users')
                .where({'Email': req.body.email})))).toParams();

        pool.query(insertQuery.text, insertQuery.values, (err, results) => {
            if (err) {
                throw err;
            } else {
                return res.status(201).send({
                    message: "Auditor creation successful",
                    user: results.rows[0]
                })
            }
        });

    });

};

const createTenant = (req, res) => {
    bcrypt.hash(req.body.Password, saltRounds, (err, hash) => {
        if (err) return res.status(400).send(err);

        var tableInsert = {
            UserName: req.body.UserName,
            Hash: hash,
            Email: req.body.Email,
            RoleId: tenantRoleId
        };
    
        const insertQuery = sql.insert('Users', _.keys(tableInsert))
            .select().from(sql.values(tableInsert).as('v').columns().types())
            .where(sql.not(sql.exists(
                sql.select('Email').from('Users')
                .where({'Email': req.body.Email})))).toParams();

        pool.query(insertQuery.text, insertQuery.values, (err, results) => {
            if (err) {
                throw err;
            } else {
                return res.status(201).send({
                    message: "Tenant creation successful",
                    user: results.rows[0]
                })
            }
        });

    });

};

const deleteTenant = (req, res) => {
    let deleteQuery = sql.delete('Users')
        .where({UserId: req.body.UserId}).toParams();

    pool.query(deleteQuery.text, deleteQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        return res.send({
            message: "Tenant deleted"
        });
    });
};

/*
    Query functions
*/

const userQueryByRole = (role, req, res) => {
    let getUsersQuery = sql.select(['UserId', 'UserName', 'Email']).from('Users')
        .where({RoleId: role}).orderBy('UserId').toParams();
    pool.query(getUsersQuery.text, getUsersQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        res.status(200).send({
            status: 200,
            data: results.rows
        });
    });
};



module.exports = {
    getTenants,
    getAuditors,
    getInstitutions,
    createAuditor,
    createTenant,
    deleteTenant
};