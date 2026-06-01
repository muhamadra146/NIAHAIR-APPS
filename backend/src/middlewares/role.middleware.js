const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Unauthorized", StatusCodes.UNAUTHORIZED));
  }
  if (!roles.includes(req.user.roleCode)) {
    return next(new AppError("Forbidden", StatusCodes.FORBIDDEN));
  }
  next();
};

module.exports = authorize;
