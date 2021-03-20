let router = require('express').Router();
const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const pool = db.getPool();

// This is getting tedious damn it
const tenantRoleId = 2;

// GET /outlets - Get all retail outlets
router.get('/outlets', (req, res) => {
    let getOutletsQuery = sql.select([
            'OutletId', 
            'OutletName', 
            'UserName', 
            'InstitutionName', 
            'UnitNumber', 
            'to_char("TenancyStart", \'YYYY-MM-DD\') as "TenancyStart"', 
            'to_char("TenancyEnd", \'YYYY-MM-DD\') as "TenancyEnd"'])
        .from('RetailOutlets')
        .join('Users').on('Users.UserId', 'RetailOutlets.TenantId')
        .join('Institutions').on('Users.InstitutionId', 'Institutions.InstitutionId')
        .toParams();

    pool.query(getOutletsQuery.text, getOutletsQuery.values, (err, results) => {
        if (err) {
            return res.status(200).send({
                message: err
            });
        }

        return res.status(200).send(results.rows);
    });
});

// POST /outlets/add - Add retail outlet (DEVELOPMENT ONLY)
router.post('/outlets/add', (req, res) => {
    // Check if tenant exists
    let checkTenantQuery = sql.select('UserId').from('Users')
        .where({Email: req.body.tenant_email, RoleId: tenantRoleId}).toParams();

    pool.query(checkTenantQuery.text, checkTenantQuery.values, (err, results) => {
        if (err) return res.status(400).send(err);

        if (results.rows.length === 0) {
            return res.status(404).send({
                message: "Tenant does not exist"
            });
        } else {
            let tenantId = results.rows[0].UserId;

            const insertOutletQuery = sql(`INSERT INTO "RetailOutlets" ("OutletName", "TenantId", "UnitNumber", "TenancyStart", "TenancyEnd") VALUES (
                    '${req.body.outlet_name}', 
                    ${tenantId}, 
                    '${req.body.unit_number}',
                    to_date('${req.body.tenancy_start}', 'YYYY-MM-DD'),
                    to_date('${req.body.tenancy_end}', 'YYYY-MM-DD'));`)
                .toString();
    
            pool.query(insertOutletQuery, (err, results) => {
                if (err) throw err;
                return res.status(201).send({
                    message: "Successfully added outlet",
                    outlet: results.rows[0]
                });
            });
        }

    });
});


module.exports = router;