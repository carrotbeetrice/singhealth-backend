let router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const tenantActionQueries = require("../queries/tenantActionQueries");

const maxImages = 10;

router.get("/unresolved/:tenantId", tenantActionQueries.getUnresolvedNCs);
router.get("/resolve/:ncId", tenantActionQueries.getNCReport);
router.post("/submit", upload.array("images", maxImages), tenantActionQueries.submitRectification);

// DEVELOPMENT ONLY
router.get("/test/images", tenantActionQueries.getReportImages);

module.exports = router;
