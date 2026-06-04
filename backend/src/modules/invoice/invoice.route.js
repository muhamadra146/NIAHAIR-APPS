const { Router }   = require("express");
const authenticate = require("../../middlewares/auth.middleware");
const authorize    = require("../../middlewares/role.middleware");
const validate     = require("../../middlewares/validate.middleware");
const { ROLES }    = require("../../common/constants/role.constant");
const { createInvoiceSchema } = require("./invoice.validation");
const {
  getAllController,
  getByIdController,
  createController,
  cancelController,
} = require("./invoice.controller");

const router = Router();

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);
router.post("/",   authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER), validate(createInvoiceSchema), createController);
router.patch("/:id/cancel", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER), cancelController);

module.exports = router;
