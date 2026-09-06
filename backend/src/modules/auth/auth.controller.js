const { login, getMe, forgotPassword, resetPassword, refreshAccessToken, logout } = require("./auth.service");
const { success } = require("../../common/responses/apiResponse");

const loginController = async (req, res, next) => {
  try {
    const result = await login(req.body);
    return success(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
};

const getMeController = async (req, res, next) => {
  try {
    const result = await getMe(req.user.id);
    return success(res, result, "User fetched");
  } catch (err) {
    next(err);
  }
};

const forgotPasswordController = async (req, res, next) => {
  try {
    await forgotPassword(req.body);
    // Always return 200 — never reveal whether email exists
    return success(res, null, "Jika email terdaftar, link reset password telah dikirim");
  } catch (err) {
    next(err);
  }
};

const resetPasswordController = async (req, res, next) => {
  try {
    await resetPassword(req.body);
    return success(res, null, "Password berhasil direset. Silakan login dengan password baru.");
  } catch (err) {
    next(err);
  }
};

const refreshTokenController = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await refreshAccessToken(refreshToken);
    return success(res, result, "Token refreshed");
  } catch (err) {
    next(err);
  }
};

const logoutController = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id; // from authenticate middleware (optional)
    await logout(refreshToken, userId);
    return success(res, null, "Logout berhasil");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  loginController,
  getMeController,
  forgotPasswordController,
  resetPasswordController,
  refreshTokenController,
  logoutController,
};
