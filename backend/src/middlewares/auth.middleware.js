const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", StatusCodes.UNAUTHORIZED));
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    next(new AppError(message, StatusCodes.UNAUTHORIZED));
  }
};

module.exports = authenticate;
