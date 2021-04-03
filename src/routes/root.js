let router = require('express').Router();

/**
 * Default API response - for development only!
 */
router.get('/', (req, res) => {
    res.json({
       not_obi_wan: "Hello there",
       not_grievous: "GENERAL KENOBI"
    });
});

module.exports = router;