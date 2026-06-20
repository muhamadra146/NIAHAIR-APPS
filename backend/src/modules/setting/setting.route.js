const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { getByKeyController, upsertController } = require("./setting.controller");

const router = Router();

router.get("/:key",  authenticate, getByKeyController);
router.put("/:key",  authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN), upsertController);

module.exports = router;
