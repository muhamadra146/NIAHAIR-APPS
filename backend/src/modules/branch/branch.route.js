const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { createBranchSchema, updateBranchSchema } = require("./branch.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./branch.controller");
const router = Router();

// CRUD routes
router.get("/", authenticate, getAllController);
router.post("/", authenticate, validate(createBranchSchema), createController);
router.get("/:id", authenticate, getByIdController);
router.put("/:id", authenticate, validate(updateBranchSchema), updateController);

module.exports = router;
