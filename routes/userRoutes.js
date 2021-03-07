let router = require('express').Router();
const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const bcrypt = require('bcrypt');
const pool = db.getPool();

// TODO: Find out how to not hardcode the user roles
const tenantRoleId = 2;
const auditorRoleId = 1;
const saltRounds = 10;

// GET /tenants - Get list of all tenants
router.get('/tenants', (req, res) => {
    let getTenantsQuery = sql.select().from('Users')
        .where({RoleId: tenantRoleId}).orderBy('UserId').toParams();
    pool.query(getTenantsQuery.text, getTenantsQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        res.status(200).send(results.rows);
    });
});


// GET /auditors - Get list of all auditors
router.get('/auditors', (req, res) => {
    let getAuditorsQuery = sql.select().from('Users')
        .where({RoleId: auditorRoleId}).orderBy('UserId').toParams();
    pool.query(getAuditorsQuery.text, getAuditorsQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        res.status(200).send(results.rows);
    });
});


// GET /institutions - Get list of all institutions
router.get('/institutions', (req, res) => {
    let getInstitutionsQuery = sql.select().from('Institutions').orderBy('InstitutionId').toParams();
    pool.query(getInstitutionsQuery.text, getInstitutionsQuery.values, (err, results) => {
        if (err) {
            return res.status(400).send({
                message: "GET /institutions failed"
            });
        }
        return res.status(200).json(results.rows);
    });
});


// GET /login - Login user
router.get('/login', (req, res) => {
    let loginQuery = sql.select().from('Users')
        .where({Email: req.body.email}).toParams();

    pool.query(loginQuery.text, loginQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        
        if (results.rows === null) {
            return res.status(400).send({
                message: "User not found"
            });
        } else {
            var hash = results.rows[0].Hash;

            bcrypt.compare(req.body.password, hash, (err, results) => {
                if (err) return res.status(400).send(err);

                if (results) {
                    return res.status(201).send({
                        message: "Login success"
                    });
                } else {
                    return res.status(403).send({
                        message: "Wrong password"
                    });
                }
            });

        }

    });
});


// POST /auditors/register - Create auditor
router.post('/auditors/create', (req, res) => {
    // Get institution id
    let getIdQuery = sql.select('InstitutionId').from('Institutions')
    .where({Name: req.body.institution}).toParams();

    pool.query(getIdQuery.text, getIdQuery.values, (err, result) => {
        if (err) return res.status(400).json(err);

        bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
            if (err) return res.status(400).send(err);

            var tableInsert = {
                Name: req.body.name,
                Hash: hash,
                Email: req.body.email,
                RoleId: auditorRoleId,
                InstitutionId: result.rows[0].InstitutionId
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

    });

});


// POST /tenants/create - Create new tenant - auditor privilege!!!
router.post('/tenants/create', (req, res) => {
    // Get institution id
    let getIdQuery = sql.select('InstitutionId').from('Institutions')
        .where({Name: req.body.institution}).toParams();

    pool.query(getIdQuery.text, getIdQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);

        bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
            if (err) return res.status(400).send(err);

            var tableInsert = {
                Name: req.body.name,
                Hash: hash,
                Email: req.body.email,
                RoleId: tenantRoleId,
                InstitutionId: results.rows[0].InstitutionId
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
                        message: "Tenant creation successful",
                        user: results.rows[0]
                    })
                }
            });

        });

    });

});


// DELETE /tenants/delete - Delete tenant
router.delete('/tenants/delete', (req, res) => {
    let deleteQuery = sql.delete('Users')
        .where({Email: req.body.email}).toParams();

    pool.query(deleteQuery.text, deleteQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        return res.send({
            message: "Tenant deleted"
        });
    });
});


module.exports = router;