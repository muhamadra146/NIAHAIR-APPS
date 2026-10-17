const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Silakan login terlebih dahulu", StatusCodes.UNAUTHORIZED));
  }
  if (!roles.includes(req.user.roleCode)) {
    return next(new AppError("Anda tidak memiliki akses untuk tindakan ini", StatusCodes.FORBIDDEN));
  }
  next();
};

module.exports = authorize;
