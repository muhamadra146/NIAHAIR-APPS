const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");
const { findActiveStatus } = require("../modules/auth/auth.repository");

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", StatusCodes.UNAUTHORIZED));
  }

  const token = header.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Sesi berakhir, silakan login lagi" : "Token tidak valid";
    return next(new AppError(message, StatusCodes.UNAUTHORIZED));
  }

  // Akun atau karyawan yang dinonaktifkan langsung tidak bisa dipakai, walau token belum kedaluwarsa
  try {
    const status = await findActiveStatus(payload.id);
    if (!status || !status.isActive || status.employee?.isActive === false) {
      return next(new AppError("Akun tidak aktif", StatusCodes.UNAUTHORIZED));
    }
  } catch (err) {
    return next(err);
  }

  req.user = payload;
  next();
};

module.exports = authenticate;
