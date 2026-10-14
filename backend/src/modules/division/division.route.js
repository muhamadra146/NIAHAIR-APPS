const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createDivisionSchema, updateDivisionSchema } = require("./division.validation");
const { getAllController, getByIdController, createController, updateController } = require("./division.controller");

const router = Router();

// Daftar divisi dibaca semua user (label di data karyawan / jadwal);
// membuat & mengubah divisi hanya Owner / Super Admin.
const ADMIN = [ROLES.SUPER_ADMIN, ROLES.OWNER];

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/",   authenticate, authorize(...ADMIN), validate(createDivisionSchema), createController);
router.put("/:id", authenticate, authorize(...ADMIN), validate(updateDivisionSchema), updateController);

module.exports = router;
