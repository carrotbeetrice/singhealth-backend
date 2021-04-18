let router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const reportQueries = require("../queries/reportQueries");

const maxImages = 10;

//TODO: Add the rest of the report endpoints
router.post(
  "/submit",
  upload.array("images", maxImages),
  reportQueries.createAuditReport
);

router.get("/questions/:typeId", reportQueries.getChecklistQuestions);
router.get("/checklistTypes", reportQueries.getChecklistTypes);

// DEVELOPMENT ONLY
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

router.post("/questions/add", reportQueries.addDefaultQuestion);
router.post("/tenant", reportQueries.exportTenantReport);

module.exports = router;
