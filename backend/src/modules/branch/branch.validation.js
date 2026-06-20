const { object, string, pipe, optional, boolean, minLength, number, integer, minValue } = require("valibot");

const createBranchSchema = object({
  code:         pipe(string(), minLength(1, "Code is required")),
  name:         pipe(string(), minLength(1, "Name is required")),
  address:      optional(string()),
  city:         optional(string()),
  province:     optional(string()),
  phone:        optional(string()),
  latitude:     optional(number()),
  longitude:    optional(number()),
  radiusMeters: optional(pipe(number(), integer(), minValue(1))),
});

const updateBranchSchema = object({
  code:         optional(pipe(string(), minLength(1, "Code cannot be empty"))),
  name:         optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  address:      optional(string()),
  city:         optional(string()),
  province:     optional(string()),
  phone:        optional(string()),
  isActive:     optional(boolean()),
  latitude:     optional(number()),
  longitude:    optional(number()),
  radiusMeters: optional(pipe(number(), integer(), minValue(1))),
});

module.exports = { createBranchSchema, updateBranchSchema };
