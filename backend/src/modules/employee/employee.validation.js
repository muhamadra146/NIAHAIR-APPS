const { object, string, pipe, email, optional, nullable, boolean, minLength, array } = require("valibot");

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
  homeBranchId:      optional(nullable(string())),
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
  homeBranchId:      optional(nullable(string())),
});

const updateEmployeeBranchesSchema = object({
  branchIds: array(pipe(string(), minLength(1, "Branch ID is required"))),
});

module.exports = { createEmployeeSchema, updateEmployeeSchema, updateEmployeeBranchesSchema };
