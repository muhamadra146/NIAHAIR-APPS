const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getAllController, getMyController, getByIdController, createController, reviewController } =
  require("./correction.controller");

const router = Router();
const ADMIN  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

router.get("/my",        authenticate, getMyController);
router.get("/",          authenticate, authorize(...ADMIN), getAllController);
router.get("/:id",       authenticate, getByIdController);
router.post("/",         authenticate, createController);
router.patch("/:id/review", authenticate, authorize(...ADMIN), reviewController);

module.exports = router;
