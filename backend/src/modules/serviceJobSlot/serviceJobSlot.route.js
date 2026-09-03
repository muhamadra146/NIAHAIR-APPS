const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { createJobSlotSchema, updateJobSlotSchema } = require("./serviceJobSlot.validation");
const { listController, createController, updateController, deleteController } = require("./serviceJobSlot.controller");

// Dipasang sebagai router(mergeParams) di bawah /items/:itemId/job-slots
const router = Router({ mergeParams: true });

router.get("/",    authenticate, listController);
router.post("/",   authenticate, validate(createJobSlotSchema), createController);
router.put("/:id", authenticate, validate(updateJobSlotSchema), updateController);
router.delete("/:id", authenticate, deleteController);

module.exports = router;
