const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { upsertSettingSchema } = require("./setting.validation");
const { getByKeyController, upsertController } = require("./setting.controller");

const router = Router();

router.get("/:key", authenticate, getByKeyController);
router.put("/:key", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN), validate(upsertSettingSchema), upsertController);

module.exports = router;
