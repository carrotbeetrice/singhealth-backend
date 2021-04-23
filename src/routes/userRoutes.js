let router = require('express').Router();
const userQueries = require('../queries/userQueries');

// GET endpoints
router.get('/tenants/:auditorId', userQueries.getTenants);
router.get('/auditors', userQueries.getAuditors);
router.get('/institutions', userQueries.getInstitutions);
router.get('/tenants/test', userQueries.getAllSHTenants);

// POST endpoints
router.post('/auditors/create', userQueries.createAuditor);
router.post('/tenants/create', userQueries.createTenant);

// DELETE endpoint
router.delete('/tenants/delete', userQueries.deleteTenant);

module.exports = router;