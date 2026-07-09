const { Router }      = require("express");
const authenticate    = require("../../middlewares/auth.middleware");
const authorize       = require("../../middlewares/role.middleware");
const requireBranch   = require("../../middlewares/branch.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { object, picklist, optional, string } = require("valibot");
const { createTransferSchema } = require("./stockTransfer.validation");
const {
  getAllController, getByIdController,
  createController, updateStatusController,
} = require("./stockTransfer.controller");

const router = Router();

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.ADMIN];

const updateStatusSchema = object({
  status:   picklist(["IN_TRANSIT", "RECEIVED"], "Status tidak valid"),
  branchId: optional(string()),
});

router.get("/",     authenticate, getAllController);
router.get("/:id",  authenticate, getByIdController);
router.post("/",    authenticate, authorize(...MANAGER_ROLES), validate(createTransferSchema), createController);
router.patch("/:id/status", authenticate, authorize(...MANAGER_ROLES), requireBranch, validate(updateStatusSchema), updateStatusController);

module.exports = router;
