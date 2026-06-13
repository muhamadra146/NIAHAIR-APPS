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
} = require("./depositPayment.controller");

// mergeParams: true — inherits :depositId when mounted at
// app.use("/deposits/:depositId/payments", router)
const router = Router({ mergeParams: true });

router.get("/",    authenticate, getAllController);
router.get("/:id", authenticate, getByIdController);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER),
  deleteController
);

router.post(
  "/",
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.CASHIER),
  uploadDeposit.single("transferProof"), // multer sebelum validate agar FormData ter-parse
  validate(createDepositPaymentSchema),
  createController
);

module.exports = router;
