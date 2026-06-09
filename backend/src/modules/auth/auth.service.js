const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { findUserByEmail, findUserById, findAllBranches } = require("./auth.repository");
const { ROLES } = require("../../common/constants/role.constant");

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const payload = {
    id:         user.id,
    email:      user.email,
    roleCode:   user.role.code,
    employeeId: user.employeeId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  const branches = user.role.code === ROLES.SUPER_ADMIN
    ? await findAllBranches()
    : (user.employee?.employeeBranches?.map((eb) => eb.branch) ?? []);

  return {
    token,
    user: {
      ...payload,
      role:     user.role,
      employee: user.employee,
      branches,
    },
  };
};

const getMe = async (userId) => {
  const user = await findUserById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  return {
    id:         user.id,
    email:      user.email,
    roleCode:   user.role.code,
    employeeId: user.employeeId,
    role:       user.role,
    employee:   user.employee,
    branches: user.role.code === ROLES.SUPER_ADMIN
      ? await findAllBranches()
      : (user.employee?.employeeBranches?.map((eb) => eb.branch) ?? []),
  };
};

module.exports = { login, getMe };
