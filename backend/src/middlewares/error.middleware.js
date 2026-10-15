const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");
const { error: errorResponse } = require("../common/responses/apiResponse");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.errors);
  }

  // Prisma known errors
  if (err.code === "P2002") {
    return errorResponse(res, "Data sudah ada (duplikat)", StatusCodes.CONFLICT);
  }
  if (err.code === "P2025") {
    return errorResponse(res, "Data tidak ditemukan", StatusCodes.NOT_FOUND);
  }
  if (err.code === "P2003") {
    // Saat menghapus: data masih dipakai. Saat membuat/mengubah: data rujukan tidak ada.
    return req.method === "DELETE"
      ? errorResponse(res, "Tidak bisa dihapus: data masih digunakan oleh record lain", StatusCodes.CONFLICT)
      : errorResponse(res, "Data terkait tidak ditemukan", StatusCodes.BAD_REQUEST);
  }
  // ID salah format (bukan UUID) / nilai tidak cocok tipe kolom
  if (err.code === "P2023" || err.code === "P2007") {
    return errorResponse(res, "Data tidak valid", StatusCodes.BAD_REQUEST);
  }
  // Input tidak valid yang lolos ke Prisma: tanggal rusak, status di luar pilihan, id kosong
  if (err.name === "PrismaClientValidationError") {
    logger.warn("Invalid input reached Prisma", { path: req.path, method: req.method });
    return errorResponse(res, "Data tidak valid", StatusCodes.BAD_REQUEST);
  }
  // new Date("bukan-tanggal").toISOString()
  if (err instanceof RangeError && /Invalid time value/i.test(err.message)) {
    return errorResponse(res, "Tanggal tidak valid", StatusCodes.BAD_REQUEST);
  }
  // Upload: file terlalu besar / tipe ditolak / field salah
  if (err.name === "MulterError") {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Ukuran file terlalu besar" : "File tidak valid";
    return errorResponse(res, msg, StatusCodes.BAD_REQUEST);
  }

  // Cloudinary menolak file (format tidak diizinkan, file rusak)
  if (err.http_code && err.http_code >= 400 && err.http_code < 500) {
    return errorResponse(res, "File tidak valid atau formatnya tidak didukung", StatusCodes.BAD_REQUEST);
  }

  // Express JSON parse error
  if (err.type === "entity.parse.failed") {
    return errorResponse(res, "Format data (JSON) tidak valid", StatusCodes.BAD_REQUEST);
  }

  logger.error("Unhandled server error", {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  const isDev = process.env.NODE_ENV === "development";
  return errorResponse(
    res,
    isDev ? err.message : "Internal Server Error",
    StatusCodes.INTERNAL_SERVER_ERROR
  );
};

module.exports = errorHandler;
