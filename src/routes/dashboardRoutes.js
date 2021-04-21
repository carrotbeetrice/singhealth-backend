let router = require('express').Router();
const dashboardQueries = require("../queries/dashboardQueries");

router.get('/:auditorId', dashboardQueries.getDashboardData);

module.exports = router;