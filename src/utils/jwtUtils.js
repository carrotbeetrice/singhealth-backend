const jwt = require('jsonwebtoken');
const config = require('../config').jwt;

module.exports = {
    validateToken: (req, res, next) => {
        const authHeader = req.headers.authorisation;
        let result;

        if (authHeader) {
            let token = req.headers.authorisation.split(' ')[1];

            let options = {expiresIn: 86400};

            try {
                // Verify that token is not expired and was issued by us
                result = jwt.verify(token, config.SECRET, options);
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
    },
    generateToken: (userID) => {
        let payload = {user: userID};
        let options = {expiresIn: 86400 }; // expires in 24 hours
        let secret = config.SECRET;
        return jwt.sign(payload, secret, options);
    }
};