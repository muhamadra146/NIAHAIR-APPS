const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { deleteController } = require("./materialUsage.controller");

const router = Router();

// Hapus material usage — MANAGEMENT + INVENTORY
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY];

router.delete("/:id", authenticate, authorize(...WRITE_ROLES), deleteController);

module.exports = router;
