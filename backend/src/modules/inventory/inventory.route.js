const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getMovementsController, getInventoriesController, syncController } = require("./inventory.controller");

const router = Router();

// Accurate sync — SUPER_ADMIN only, declared before /:id-style routes
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncController);

router.get("/movements", authenticate, getMovementsController);
router.get("/",          authenticate, getInventoriesController);

module.exports = router;
