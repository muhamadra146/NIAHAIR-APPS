const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { createComplaintSchema, updateComplaintSchema } = require("./complaint.validation");
const { getStatsController, getAllController, getByIdController, createController, updateController, deleteController } = require("./complaint.controller");

const router = Router();

router.get("/stats", authenticate, getStatsController);
router.get("/",      authenticate, getAllController);
router.get("/:id",   authenticate, getByIdController);
router.post("/",     authenticate, validate(createComplaintSchema), createController);
router.patch("/:id", authenticate, validate(updateComplaintSchema), updateController);
router.delete("/:id", authenticate, deleteController);

module.exports = router;
