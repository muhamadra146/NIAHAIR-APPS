const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getAllController, syncController } = require("./itemCategory.controller");

const router   = Router();
const ALL_ADMIN = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN];

router.get("/",     authenticate, getAllController);
router.post("/sync", authenticate, authorize(...ALL_ADMIN), syncController);

module.exports = router;
