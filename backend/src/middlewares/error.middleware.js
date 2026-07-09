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
    return errorResponse(res, "Duplicate entry", StatusCodes.CONFLICT);
  }
  if (err.code === "P2025") {
    return errorResponse(res, "Record not found", StatusCodes.NOT_FOUND);
  }

  // Express JSON parse error
  if (err.type === "entity.parse.failed") {
    return errorResponse(res, "Invalid JSON body", StatusCodes.BAD_REQUEST);
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
