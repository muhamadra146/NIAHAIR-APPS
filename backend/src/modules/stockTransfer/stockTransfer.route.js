const { Router }      = require("express");
const authenticate    = require("../../middlewares/auth.middleware");
const authorize       = require("../../middlewares/role.middleware");
const requireBranch   = require("../../middlewares/branch.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { object, picklist, optional, string, array, pipe, number, minValue, maxValue } = require("valibot");
const { createTransferSchema } = require("./stockTransfer.validation");
const {
  getAllController, getByIdController,
  createController, updateStatusController,
  deleteController, undoReceiveController,
} = require("./stockTransfer.controller");

const router = Router();

const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.INVENTORY];

const updateStatusSchema = object({
  status:        picklist(["IN_TRANSIT", "RECEIVED"], "Status tidak valid"),
  branchId:      optional(string()),
  receivedItems: optional(array(object({
    itemId:      string(),
    receivedQty: pipe(number(), minValue(0)),
  }))),
});

router.get("/",     authenticate, getAllController);
router.get("/:id",  authenticate, getByIdController);
router.post("/",    authenticate, authorize(...MANAGER_ROLES), validate(createTransferSchema), createController);
router.patch("/:id/status",       authenticate, authorize(...MANAGER_ROLES), requireBranch, validate(updateStatusSchema), updateStatusController);
router.delete("/:id",             authenticate, authorize(...MANAGER_ROLES), requireBranch, deleteController);
router.patch("/:id/undo-receive", authenticate, authorize(...MANAGER_ROLES), requireBranch, undoReceiveController);

module.exports = router;
