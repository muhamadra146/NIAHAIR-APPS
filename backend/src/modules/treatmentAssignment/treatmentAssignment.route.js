const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const authorize    = require("../../middlewares/role.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createAssignmentSchema, updateAssignmentSchema } = require("./treatmentAssignment.validation");
const {
  getByItemController,
  createController,
  updateController,
  deleteController,
} = require("./treatmentAssignment.controller");

// mergeParams: true — inherits :itemId when mounted at
// app.use("/treatment-items/:itemId/assignments", router)
const router = Router({ mergeParams: true });

// Tulis — sama dengan sesi treatment (POS) (G1-11)
const MUTATE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER];

router.get("/",       authenticate, getByItemController);
router.post("/",      authenticate, authorize(...MUTATE_ROLES), validate(createAssignmentSchema), createController);
router.put("/:id",    authenticate, authorize(...MUTATE_ROLES), validate(updateAssignmentSchema), updateController);
router.delete("/:id", authenticate, authorize(...MUTATE_ROLES), deleteController);

module.exports = router;
