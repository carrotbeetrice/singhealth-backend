let router = require('express').Router();
const directoryQueires = require('../queries/directoryQueries');

// GET /outlets - Get all retail outlets
router.get('/outlets', directoryQueires.getAllOutlets);

// POST /outlets/add - Add retail outlet
router.post('/outlets/add', directoryQueires.addOutlet);


module.exports = router;