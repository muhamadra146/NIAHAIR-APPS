const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { assignLeaveQuotaSchema } = require("./leaveQuota.validation");
const { getQuotasController, getMyQuotasController, assignController } = require("./leaveQuota.controller");

const router = Router();
const ADMIN  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

router.get("/my",  authenticate, getMyQuotasController);
router.get("/",    authenticate, authorize(...ADMIN), getQuotasController);
router.post("/",   authenticate, authorize(...ADMIN), validate(assignLeaveQuotaSchema), assignController);

module.exports = router;
