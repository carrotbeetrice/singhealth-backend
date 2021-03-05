let router = require('express').Router();
let User = require('../models/userModel.js');
const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const pool = db.getPool();

// TODO: Find out how to not hardcode the user roles
const tenantRoleId = 2;
const auditorRoleId = 1;

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
// TODO: Figure out how to implement the hash function properly
router.get('/login', (req, res) => {
    var loginUser = new User(
        null,
        req.body.email,
        req.body.password,
        null,
        null
    );

    console.log(loginUser.hash);

    let loginQuery = sql.select().from('Users')
        .where({Email: loginUser.email, Hash: loginUser.hash}).toParams();

    pool.query(loginQuery.text, loginQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        
        if (results.rows === null) {
            return res.status(400).send({
                message: "User not found"
            });
        } else if (loginUser.validPassword(req.body.password)) {
            return res.status(201).send(results.rows[0]);
        } else {
            return res.status(400).send({
                message: "Wrong password"
            });
        }

    });
});


// PUT /tenants/register - Register tenant
router.put('/tenants/register', (req, res) => {
    var toRegister = new User(
        null,
        req.body.email,
        req.body.password,
        null,
        null
    );

    let registerQuery = sql.update('Users', {Hash: toRegister.hash})
        .where({Email: toRegister.email}).returning('*').toParams();

    pool.query(registerQuery.text, registerQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);
        res.send(results.rows);
    });

});


// POST /auditors/register - Create auditor
router.post('/auditors/create', (req, res) => {
    // Get institution id
    let getIdQuery = sql.select('InstitutionId').from('Institutions')
    .where({Name: req.body.institution}).toParams();

    pool.query(getIdQuery.text, getIdQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);

        var toRegister = new User (
            req.body.name,
            req.body.email,
            req.body.password,
            auditorRoleId,
            results.rows[0].InstitutionId
        );

        var tableInsert = {
            Name: toRegister.name,
            Hash: toRegister.hash,
            Email: toRegister.email,
            RoleId: toRegister.role,
            InstitutionId: toRegister.institution
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
                    message: "Auditor creation successful"
                })
            }
        });
    });

});


// POST /tenants/create - Create new tenant (auditor privilege?)
router.post('/tenants/create', (req, res) => {
    // Get institution id
    let getIdQuery = sql.select('InstitutionId').from('Institutions')
        .where({Name: req.body.institution}).toParams();

    pool.query(getIdQuery.text, getIdQuery.values, (err, results) => {
        if (err) return res.status(400).json(err);

        var newTenant = new User(
            req.body.name, // name
            req.body.email, // email
            null, // password; blank until user registration
            tenantRoleId, // role 
            results.rows[0].InstitutionId // institution
        );
    
        var tableInsert = {
            Name: newTenant.name,
            Hash: '',
            Email: newTenant.email,
            RoleId: newTenant.role,
            InstitutionId: newTenant.institution
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
                    message: "Tenant creation successful"
                })
            }
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