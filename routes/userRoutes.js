let router = require('express').Router();
let User = require('../models/userModel.js');
const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const pool = db.getPool();

// GET /tenants - Get list of all tenants
router.get('/tenants', (req, res) => {
    let getTenantsQuery = sql.select().from('Users')
        .where({RoleId: 2}).toParams();
    pool.query(getTenantsQuery.text, getTenantsQuery.values, (err, results) => {
        if (err) throw err;
        res.status(200).send(results.rows);
    });
});

// GET /auditors - Get list of all auditors

// GET /institutions - Get list of all institutions
router.get('/institutions', (req, res) => {
    const queryVals = sql.select().from('Institutions').toParams();
    pool.query(queryVals.text, queryVals.values, (err, results) => {
        if (err) {
            return res.status(400).send({
                message: "GET /institutions failed"
            });
        }
        return res.status(200).json(results.rows);
    });
});

// POST /tenants/login - Login tenant


// POST /auditors/login - Login auditor


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
        if (err) throw err;
        res.send(results.rows);
    });

});

// POST /auditors/register - Register auditor


// POST /tenants/create - Create new tenant (auditor privilege?)
router.post('/tenants/create', (req, res) => {
    // Get institution id

    let getIdQuery = sql.select('InstitutionId').from('Institutions')
        .where({Name: req.body.institution}).toParams();

    pool.query(getIdQuery.text, getIdQuery.values, (err, results) => {
        if (err) throw err;

        var newTenant = new User(
            req.body.name, // name
            req.body.email, // email
            null, // password; blank until user registration
            2, // role 
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


module.exports = router;