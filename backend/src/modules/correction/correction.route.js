const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createCorrectionSchema, reviewCorrectionSchema } = require("./correction.validation");
const { getAllController, getMyController, getByIdController, createController, reviewController } =
  require("./correction.controller");

const router = Router();
const ADMIN  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

router.get("/my",        authenticate, getMyController);
router.get("/",          authenticate, authorize(...ADMIN), getAllController);
router.get("/:id",       authenticate, getByIdController);
router.post("/",            authenticate, validate(createCorrectionSchema), createController);
router.patch("/:id/review", authenticate, authorize(...ADMIN), validate(reviewCorrectionSchema), reviewController);

module.exports = router;
