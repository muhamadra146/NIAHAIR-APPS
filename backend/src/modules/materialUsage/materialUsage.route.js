const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { bulkSaveSchema } = require("./materialUsage.validation");
const { getBySessionController, bulkSaveController } = require("./materialUsage.controller");

// mergeParams: true — inherits :sessionId from treatment.route.js
const router = Router({ mergeParams: true });

router.get("/",       authenticate, getBySessionController);
router.post("/bulk",  authenticate, validate(bulkSaveSchema), bulkSaveController);

module.exports = router;
