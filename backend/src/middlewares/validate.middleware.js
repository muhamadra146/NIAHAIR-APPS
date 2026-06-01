const { safeParse } = require("valibot");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");

const validate = (schema, target = "body") => {
  return (req, res, next) => {
    const result = safeParse(schema, req[target]);

    if (result.success) {
      req[target] = result.output;
      return next();
    }

    const errors = result.issues.map((issue) => ({
      field: issue.path?.map((p) => p.key).join(".") ?? "value",
      message: issue.message,
    }));

    return next(new AppError("Validation failed", StatusCodes.UNPROCESSABLE_ENTITY, errors));
  };
};

module.exports = validate;
