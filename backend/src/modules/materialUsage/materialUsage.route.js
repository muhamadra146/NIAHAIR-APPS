const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate     = require("../../middlewares/validate.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { bulkSaveSchema } = require("./materialUsage.validation");
const { getBySessionController, bulkSaveController } = require("./materialUsage.controller");

// mergeParams: true — inherits :sessionId from treatment.route.js
const router = Router({ mergeParams: true });

// Simpan pemakaian bahan — POS (sesi treatment) + INVENTORY (sama dengan hapus material usage item) (G1-11)
const WRITE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.INVENTORY];

router.get("/",       authenticate, getBySessionController);
router.post("/bulk",  authenticate, authorize(...WRITE_ROLES), validate(bulkSaveSchema), bulkSaveController);

module.exports = router;
