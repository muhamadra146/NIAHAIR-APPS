const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { findUserByEmail, findUserById } = require("./auth.repository");

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
    id: user.id,
    email: user.email,
    name: user.name,
    roleCode: user.role.code,
    branchId: user.branchId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return {
    token,
    user: {
      ...payload,
      branch: user.branch,
    },
  };
};

const getMe = async (userId) => {
  const user = await findUserById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleCode: user.role.code,
    branchId: user.branchId,
    role: user.role,
    branch: user.branch,
  };
};

module.exports = { login, getMe };
