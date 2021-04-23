let router = require('express').Router();
const dashboardQueries = require("../queries/dashboardQueries");

router.get('/:userId', dashboardQueries.getDashboardData);

router.post('/monthly', dashboardQueries.getMonthlyOutletScores);

module.exports = router;