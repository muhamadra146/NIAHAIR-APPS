const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { createJobRoleSchema, updateJobRoleSchema } = require("./serviceJobRole.validation");
const { listController, createController, updateController, deleteController } = require("./serviceJobRole.controller");

// Dipasang sebagai router(mergeParams) di bawah /items/:itemId/job-roles
const router = Router({ mergeParams: true });

router.get("/",    authenticate, listController);
router.post("/",   authenticate, validate(createJobRoleSchema), createController);
router.put("/:id", authenticate, validate(updateJobRoleSchema), updateController);
router.delete("/:id", authenticate, deleteController);

module.exports = router;
