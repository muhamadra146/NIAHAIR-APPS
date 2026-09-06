const { Router }    = require("express");
const rateLimit     = require("express-rate-limit");
const {
  loginController,
  getMeController,
  forgotPasswordController,
  resetPasswordController,
  refreshTokenController,
  logoutController,
} = require("./auth.controller");
const validate     = require("../../middlewares/validate.middleware");
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} = require("./auth.validation");
const authenticate = require("../../middlewares/auth.middleware");

const router = Router();

// Max 10 percobaan login per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 menit
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." },
});

// Max 5 request forgot-password per 15 menit per IP
const forgotLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { success: false, message: "Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit." },
});

router.post("/login",           loginLimiter,  validate(loginSchema),          loginController);
router.get("/me",               authenticate,                                   getMeController);
router.post("/forgot-password", forgotLimiter, validate(forgotPasswordSchema), forgotPasswordController);
router.post("/reset-password",                 validate(resetPasswordSchema),  resetPasswordController);
router.post("/refresh",                        validate(refreshTokenSchema),   refreshTokenController);
router.post("/logout",                         logoutController);

module.exports = router;
