const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getQuotasController, getMyQuotasController, assignController } = require("./leaveQuota.controller");

const router = Router();
const ADMIN  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

router.get("/my",  authenticate, getMyQuotasController);
router.get("/",    authenticate, authorize(...ADMIN), getQuotasController);
router.post("/",   authenticate, authorize(...ADMIN), assignController);

module.exports = router;
