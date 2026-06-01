const { Router } = require("express");
const { loginController, getMeController } = require("./auth.controller");
const validate = require("../../middlewares/validate.middleware");
const { loginSchema } = require("./auth.validation");
const authenticate = require("../../middlewares/auth.middleware");

const router = Router();

router.post("/login", validate(loginSchema), loginController);
router.get("/me", authenticate, getMeController);

module.exports = router;
