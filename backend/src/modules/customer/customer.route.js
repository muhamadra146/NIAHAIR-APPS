const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../common/constants/role.constant");
const { createCustomerSchema, updateCustomerSchema } = require("./customer.validation");
const {
  getAllController,
  getByIdController,
  createController,
  updateController,
} = require("./customer.controller");
const { syncFromAccurateController } = require("./customer.sync.controller");

const router = Router();

// Sync — must be declared before /:id routes to prevent "sync" matching as an id param
router.post("/sync/accurate", authenticate, authorize(ROLES.SUPER_ADMIN), syncFromAccurateController);

// CRUD
router.get("/", authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/", authenticate, validate(createCustomerSchema), createController);
router.put("/:id", authenticate, validate(updateCustomerSchema), updateController);

module.exports = router;
