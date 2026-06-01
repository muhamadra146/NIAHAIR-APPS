const { StatusCodes } = require("http-status-codes");

const success = (res, data, message = "Success", statusCode = StatusCodes.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const created = (res, data, message = "Created") => {
  return success(res, data, message, StatusCodes.CREATED);
};

const error = (res, message = "Internal Server Error", statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { success, created, error };
