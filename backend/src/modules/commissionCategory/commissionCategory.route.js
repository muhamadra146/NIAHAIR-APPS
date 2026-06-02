const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { createCommissionCategorySchema, updateCommissionCategorySchema } = require("./commissionCategory.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./commissionCategory.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.post("/",   authenticate, validate(createCommissionCategorySchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, validate(updateCommissionCategorySchema), updateController);

module.exports = router;
