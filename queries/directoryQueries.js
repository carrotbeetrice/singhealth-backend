const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const pool = db.getPool();

// This is getting tedious damn it
const tenantRoleId = 2;

const getAllOutlets = (req, res) => {
    let getOutletsQuery = sql.select().from('getAllOutlets()').orderBy('outletid').toParams();

    pool.query(getOutletsQuery.text, getOutletsQuery.values, (err, results) => {
        if (err) {
            return res.status(200).send({
                message: err
            });
        }

        return res.status(200).send(results.rows);
        // return res.status(200).send({
        //     status: 200,
        //     outlets: results.rows
        // });
    });
};

const addOutlet = (req, res) => {
    console.log(req.body);

    // Check if tenant exists
    let checkTenantQuery = sql.select('UserId').from('Users')
        .where({Email: req.body.email, RoleId: tenantRoleId}).toParams();

    pool.query(checkTenantQuery.text, checkTenantQuery.values, (err, results) => {
        if (err) return res.status(400).send(err);

        if (results.rows.length === 0) {
            return res.status(404).send({
                message: "Tenant does not exist"
            });
        } else {
            let tenantId = results.rows[0].UserId;

            const insertOutletQuery = sql(`INSERT INTO "RetailOutlets" ("OutletName", "TenantId", "UnitNumber", "TenancyStart", "TenancyEnd") VALUES (
                    '${req.body.outletname}', 
                    ${tenantId}, 
                    '${req.body.unitnumber}',
                    to_date('${req.body.tenancystart}', 'YYYY/MM/DD'),
                    to_date('${req.body.tenancyend}', 'YYYY/MM/DD'));`)
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
};

// TODO: Make the institution field non-editable in the frontend
const updateOutlet = (req, res) => {
    console.log(req.body);
    let updateOutletQuery = sql.select().from(sql(`updateOutlet(
        ${req.body.outletid},
        '${req.body.outletname}',
        '${req.body.unitnumber}',
        '${req.body.email}',
        '${req.body.tenancystart}',
        '${req.body.tenancyend}'
    )`)).toParams();
    
    pool.query(updateOutletQuery.text, updateOutletQuery.values, (err, result) => {
        if (err) {
            return res.status(500).send({
                status: 500,
                error: err
            });
        } else {
            return res.status(200).send({
                status: 200,
                result: result.rows[0]
            });
        }
    });
};

const deleteOutlet = (req, res) => {
    let deleteOutletQuery = sql.delete('RetailOutlets').where({
        OutletId: parseInt(req.body.outletid)
    }).toParams();

    pool.query(deleteOutletQuery.text, deleteOutletQuery.values, (err, results) => {
        if (err) {
            return res.status(500).send({
                status: 500,
                error: err
            });
        } else {
            return res.status(200).send({
                status: 200,
                result: "Outlet successfully deleted"
            });
        }
    });
};

module.exports = {
    getAllOutlets,
    addOutlet,
    updateOutlet,
    deleteOutlet
};