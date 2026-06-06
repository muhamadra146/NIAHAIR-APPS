const { object, string, pipe, email, optional, boolean, minLength } = require("valibot");

const createEmployeeSchema = object({
  name:              pipe(string(), minLength(1, "Name is required")),
  roleId:            pipe(string(), minLength(1, "Role ID is required")),
  employeeCode:      optional(string()),
  phone:             optional(string()),
  email:             optional(pipe(string(), email("Invalid email address"))),
  hireDate:          optional(string()),
  birthDate:         optional(string()),
  address:           optional(string()),
  emergencyContact:  optional(string()),
  commissionEnabled: optional(boolean()),
});

const updateEmployeeSchema = object({
  name:              optional(pipe(string(), minLength(1, "Name cannot be empty"))),
  roleId:            optional(string()),
  employeeCode:      optional(string()),
  phone:             optional(string()),
  email:             optional(pipe(string(), email("Invalid email address"))),
  hireDate:          optional(string()),
  birthDate:         optional(string()),
  address:           optional(string()),
  emergencyContact:  optional(string()),
  commissionEnabled: optional(boolean()),
  isActive:          optional(boolean()),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema };
