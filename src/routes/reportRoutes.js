let router = require('express').Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});
const reportQueries  = require('../queries/reportQueries');

router.post('/image/upload/test', upload.single('image'), reportQueries.uploadImage);

router.post('/image/get', reportQueries.getImage);

module.exports = router;