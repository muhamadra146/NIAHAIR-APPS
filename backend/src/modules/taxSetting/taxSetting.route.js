const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { taxSettingSchema } = require("./taxSetting.validation");
const { getAllController, createController, updateController } = require("./taxSetting.controller");

const router = Router();

// Tarif PPh 21 (PAY-037): Finance melihat; Super Admin & Owner mengubah (sama dengan Akun Gaji)
router.get("/",    authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE), getAllController);
router.post("/",   authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), validate(taxSettingSchema), createController);
router.put("/:id", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER), validate(taxSettingSchema), updateController);

module.exports = router;
