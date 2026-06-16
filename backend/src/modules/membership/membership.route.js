const { Router } = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createMembershipSchema, updateMembershipSchema } = require("./membership.validation");
const { object, string, pipe, minLength } = require("valibot");
const {
  getAllController, getByIdController,
  createController, updateController, deleteController,
  getCustomerMembershipController, assignMembershipController, cancelMembershipController,
} = require("./membership.controller");

const router = Router();

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN];

const assignSchema = object({ membershipId: pipe(string(), minLength(1, "membershipId wajib diisi")) });

router.get("/",   authenticate, getAllController);
router.post("/",  authenticate, authorize(...ADMIN_ROLES), validate(createMembershipSchema), createController);

// Customer membership routes — declared before /:id to avoid param capture
router.get("/customers/:customerId",         authenticate, getCustomerMembershipController);
router.post("/customers/:customerId/assign", authenticate, authorize(...ADMIN_ROLES), validate(assignSchema), assignMembershipController);
router.post("/customers/:customerId/cancel", authenticate, authorize(...ADMIN_ROLES), cancelMembershipController);

router.get("/:id",    authenticate, getByIdController);
router.put("/:id",    authenticate, authorize(...ADMIN_ROLES), validate(updateMembershipSchema), updateController);
router.delete("/:id", authenticate, authorize(...ADMIN_ROLES), deleteController);

module.exports = router;
