const { Router }      = require("express");
const authenticate    = require("../../middlewares/auth.middleware");
const authorize       = require("../../middlewares/role.middleware");
const validate        = require("../../middlewares/validate.middleware");
const uploadDeposit   = require("../../middlewares/depositUpload.middleware");
const { ROLES }       = require("../../common/constants/role.constant");
const { createDepositPaymentSchema } = require("./depositPayment.validation");
const {
  getAllController,
  getByDepositController,
  getByIdController,
  createController,
  deleteController,
  summaryController,
  resyncController,
} = require("./depositPayment.controller");

// mergeParams: true — inherits :depositId when mounted at
// app.use("/deposits/:depositId/payments", router)
const router = Router({ mergeParams: true });

// Baca: role yang punya menu Pembayaran Deposit (POS + OFFICE/FINANCE lihat saja). INVENTORY tidak.
const READ_ROLES  = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER, ROLES.OFFICE, ROLES.FINANCE];

router.get("/",        authenticate, authorize(...READ_ROLES), getAllController);
router.get("/summary", authenticate, authorize(...READ_ROLES), summaryController);
router.get("/:id",     authenticate, authorize(...READ_ROLES), getByIdController);

router.post("/:id/resync", authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER), resyncController);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER),
  deleteController
);

router.post(
  "/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER),
  uploadDeposit.single("transferProof"), // multer sebelum validate agar FormData ter-parse
  validate(createDepositPaymentSchema),
  createController
);

module.exports = router;
