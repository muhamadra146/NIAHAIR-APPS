const {
  object,
  string,
  pipe,
  optional,
  minLength,
  maxLength,
  boolean,
  number,
  minValue,
  maxValue,
} = require("valibot");

const roleNameSchema = pipe(
  string(),
  minLength(1, "Role name is required"),
  maxLength(50, "Role name max 50 characters")
);

const createJobRoleSchema = object({
  roleName:       roleNameSchema,
  commissionRate: pipe(
    number("Commission rate must be a number"),
    minValue(0,   "Rate tidak boleh negatif"),
    maxValue(100, "Rate maksimal 100%")
  ),
  sortOrder: optional(pipe(number(), minValue(0))),
});

const updateJobRoleSchema = object({
  roleName:       optional(roleNameSchema),
  commissionRate: optional(
    pipe(
      number("Commission rate must be a number"),
      minValue(0,   "Rate tidak boleh negatif"),
      maxValue(100, "Rate maksimal 100%")
    )
  ),
  sortOrder: optional(pipe(number(), minValue(0))),
  isActive:  optional(boolean()),
});

module.exports = { createJobRoleSchema, updateJobRoleSchema };
