const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { createSessionSchema, updateSessionSchema } = require("./treatment.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./treatment.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/",   authenticate, validate(createSessionSchema), createController);
router.put("/:id", authenticate, validate(updateSessionSchema), updateController);

module.exports = router;
