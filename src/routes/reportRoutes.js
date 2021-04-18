let router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const reportQueries = require("../queries/reportQueries");

const maxImages = 10;

//TODO: Add the rest of the report endpoints
router.post(
  "/image/upload/test",
  upload.single("image"),
  reportQueries.uploadImage
);
router.post(
  "/image/upload/multiple",
  upload.array("images", maxImages),
  reportQueries.uploadMultipleImages
);

router.post("/image/get", reportQueries.getImage);
router.post("/image/url", reportQueries.getImageUrl);

router.post("/questions/get", reportQueries.getChecklistQuestions);

// router.post('/questions/types', reportQueries.getChecklistTypes);

// DEVELOPMENT ONLY
router.post("/questions/add", reportQueries.addDefaultQuestion);
router.post("/tenant", reportQueries.exportTenantReport);

module.exports = router;
