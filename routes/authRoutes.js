let router = require('express').Router();
const db = require('../pgpool');
const sql = require('sql-bricks-postgres');
const _ = require('underscore');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = db.getPool();

// GET /auth - Authenticate user
router.get('/', (req, res) => {
    let authResults = {};
    let status = 200;

    let loginQuery = sql.select(['UserId', 'UserName', 'Email', 'Hash', 'InstitutionName', 'RoleId']).from('Users')
        .join('Institutions').on('Users.InstitutionId', 'Institutions.InstitutionId')
        .where({Email: req.body.email}).toParams();

    pool.query(loginQuery.text, loginQuery.values, (err, results) => {
        if (err) {
            status = 500;
            authResults.status = status;
            authResults.error = err;
            return res.status(status).send(authResults);
        }

        if (results.rows.length === 0) {
            status = 404;
            authResults.status = status;
            authResults.error = "Authentication error: User not found";
            return res.status(status).send(authResults);
        } else {
            const userInfo = results.rows[0];
            var hash = userInfo.Hash;

            bcrypt.compare(req.body.password, hash, (err, results) => {
                if (err) {
                    status = 500;
                    authResults.status = status;
                    authResults.error = err;
                    return res.status(status).send(authResults);
                }
                
                if (results) {
                    status = 200;
                    authResults.status = status;

                    let user = {
                        id: userInfo.UserId,
                        name: userInfo.UserName,
                        email: userInfo.Email,
                        institution: userInfo.InstitutionName,
                        role: userInfo.RoleId
                    };
                    authResults.user = user;

                    // Create token
                    // let payload = {user: user.id};
                    // let options = {expiresIn: 86400 }; // expires in 24 hours
                    // let secret = config.secret;
                    // let token = jwt.sign(payload, secret, options);
                    // authResults.token = token;

                    return res.status(status).send(authResults);
                } else {
                    return res.status(403).send({
                        status: 403,
                        error: "Wrong password"
                    });
                }
            });

        }

    });
});

module.exports = router;