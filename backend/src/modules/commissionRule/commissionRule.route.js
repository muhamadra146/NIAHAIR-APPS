const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const { createCommissionRuleSchema, updateCommissionRuleSchema } = require("./commissionRule.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./commissionRule.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.post("/",   authenticate, validate(createCommissionRuleSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, validate(updateCommissionRuleSchema), updateController);

module.exports = router;
