const { object, string, pipe, email, optional, picklist, minLength, boolean } = require("valibot");

const createCustomerSchema = object({
  name: pipe(string(), minLength(1, "Name is required")),
  customerNo: optional(string()),
  mobilePhone: optional(string()),
  email: optional(pipe(string(), email("Invalid email address"))),
  address: optional(string()),
  city: optional(string()),
  province: optional(string()),
  birthDate: optional(string()),
  gender: optional(picklist(["MALE", "FEMALE"], "Gender must be MALE or FEMALE")),
  notes: optional(string()),
});

const updateCustomerSchema = object({
  name: optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  customerNo: optional(string()),
  mobilePhone: optional(string()),
  email: optional(pipe(string(), email("Invalid email address"))),
  address: optional(string()),
  city: optional(string()),
  province: optional(string()),
  birthDate: optional(string()),
  gender: optional(picklist(["MALE", "FEMALE"], "Gender must be MALE or FEMALE")),
  notes: optional(string()),
  isActive: optional(boolean()),
});

module.exports = { createCustomerSchema, updateCustomerSchema };
