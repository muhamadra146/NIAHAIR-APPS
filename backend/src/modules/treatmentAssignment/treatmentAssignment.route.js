const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
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

router.get("/",       authenticate, getByItemController);
router.post("/",      authenticate, validate(createAssignmentSchema), createController);
router.put("/:id",    authenticate, validate(updateAssignmentSchema), updateController);
router.delete("/:id", authenticate, deleteController);

module.exports = router;
