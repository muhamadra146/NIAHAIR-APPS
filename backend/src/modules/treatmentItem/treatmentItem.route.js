const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { createItemSchema, updateItemSchema } = require("./treatmentItem.validation");
const {
  getBySessionController,
  createController,
  updateController,
  deleteController,
} = require("./treatmentItem.controller");

// mergeParams: true — inherits :sessionId from the parent treatment router
// when mounted as router.use("/:sessionId/items", treatmentItemRouter).
const router = Router({ mergeParams: true });

router.get("/",       authenticate, getBySessionController);
router.post("/",      authenticate, validate(createItemSchema), createController);
router.put("/:id",    authenticate, validate(updateItemSchema), updateController);
router.delete("/:id", authenticate, deleteController);

module.exports = router;
