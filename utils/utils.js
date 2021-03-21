const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = {
    validateToken: (req, res, next) => {
        const authHeader = req.headers.authorisation;
        let result;

        if (authHeader) {
            let token = req.headers.authorisation.split(' ')[1];

            let options = {expiresIn: 86400};

            try {
                // Verify that token is not expired and was issued by us
                result = jwt.verify(token, config.secret, options);
                req.decoded = result;
                next();
            } catch (err) {
                result = {
                    status: 500,
                    error: err
                };
                res.status(500).send(result);
            }
        } else {
            result = {
                status: 401,
                error: "Authentication failed: Token required"
            };
            res.status(401).send(result);
        }
    }
};