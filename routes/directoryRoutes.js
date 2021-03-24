let router = require('express').Router();
const directoryQueries = require('../queries/directoryQueries');

// GET /outlets - Get all retail outlets
router.get('/outlets', directoryQueries.getAllOutlets);

// POST /outlets/add - Add retail outlet
router.put('/outlets/add', directoryQueries.addOutlet);

router.post('/outlets/update', directoryQueries.updateOutlet);

router.delete('/outlets/delete', directoryQueries.deleteOutlet);

module.exports = router;