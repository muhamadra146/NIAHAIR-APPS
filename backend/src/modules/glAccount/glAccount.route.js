const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { syncGlAccountsController, getGlAccountsController, updateUsageController } = require("./glAccount.controller");

const router = Router();

// Sync from Accurate — SUPER_ADMIN only
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncGlAccountsController);

// List all active GL accounts
router.get("/", authenticate, getGlAccountsController);

// Update usage tag per account — SUPER_ADMIN only
router.patch("/:id/usage", authenticate, authorize(ROLES.SUPER_ADMIN), updateUsageController);

module.exports = router;
