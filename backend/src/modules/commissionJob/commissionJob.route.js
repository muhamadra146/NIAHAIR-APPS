const router    = require("express").Router({ mergeParams: true });
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const ctrl = require("./commissionJob.controller");

// Baca job komisi — MANAGEMENT + FINANCE
const VIEW_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.FINANCE];
// Ubah job komisi — ADMIN only
const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER];

// mergeParams: true → categoryId tersedia dari parent router
router.get("/",        authenticate, authorize(...VIEW_ROLES),  ctrl.list);
router.post("/",       authenticate, authorize(...ADMIN_ROLES), ctrl.create);
router.put("/:id",     authenticate, authorize(...ADMIN_ROLES), ctrl.update);
router.delete("/:id",  authenticate, authorize(...ADMIN_ROLES), ctrl.remove);

module.exports = router;
