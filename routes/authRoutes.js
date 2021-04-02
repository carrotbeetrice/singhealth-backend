let router = require('express').Router();
const authQueries = require('../queries/authQueries');

router.post('/', authQueries.userAuth);

module.exports = router;