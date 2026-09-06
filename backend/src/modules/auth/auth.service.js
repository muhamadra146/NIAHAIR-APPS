const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findAllBranches,
  findUserByEmailRaw,
  findUserByIdRaw,
  updatePasswordHash,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
} = require("./auth.repository");
const { ROLES } = require("../../common/constants/role.constant");
const { sendPasswordResetEmail } = require("../../common/utils/mailer");

// ── Token Helpers ─────────────────────────────────────────────────────────────

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Issue a new JWT access token for the given user payload.
 */
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

/**
 * Generate an opaque refresh token, store its hash in DB, return plain token.
 */
const issueRefreshToken = async (userId) => {
  const plain     = crypto.randomBytes(64).toString("hex");
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );
  await createRefreshToken(userId, tokenHash, expiresAt);
  return plain;
};

// ── Login ─────────────────────────────────────────────────────────────────────

const login = async ({ identifier, password }) => {
  const user = identifier.includes("@")
    ? await findUserByEmail(identifier)
    : await findUserByUsername(identifier);

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

  const token        = signAccessToken(payload);
  const refreshToken = await issueRefreshToken(user.id);

  const branches = user.role.code === ROLES.SUPER_ADMIN
    ? await findAllBranches()
    : (user.employee?.employeeBranches?.map((eb) => eb.branch) ?? []);

  return {
    token,
    refreshToken,
    user: {
      ...payload,
      role:     user.role,
      employee: user.employee,
      branches,
    },
  };
};

// ── Refresh Access Token ──────────────────────────────────────────────────────

/**
 * Exchange a valid refresh token for a new access token.
 * Implements rotation: old token is deleted, new refresh token is issued.
 */
const refreshAccessToken = async (plainToken) => {
  if (!plainToken) {
    throw new AppError("Refresh token wajib diisi", StatusCodes.BAD_REQUEST);
  }

  const tokenHash = hashToken(plainToken);
  const stored    = await findRefreshToken(tokenHash);

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(
      "Session kadaluarsa. Silakan login kembali.",
      StatusCodes.UNAUTHORIZED,
    );
  }

  const { user } = stored;
  if (!user || !user.isActive) {
    throw new AppError(
      "Akun tidak ditemukan atau tidak aktif",
      StatusCodes.UNAUTHORIZED,
    );
  }

  // Delete the used refresh token (rotation — one-time use)
  await deleteRefreshToken(tokenHash);

  const payload = {
    id:         user.id,
    email:      user.email,
    roleCode:   user.role.code,
    employeeId: user.employeeId,
  };

  const newAccessToken  = signAccessToken(payload);
  const newRefreshToken = await issueRefreshToken(user.id);

  return { token: newAccessToken, refreshToken: newRefreshToken };
};

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * Invalidate the given refresh token (single-device logout).
 * Pass logoutAll=true to revoke all sessions for the user.
 */
const logout = async (plainToken, userId, logoutAll = false) => {
  if (logoutAll && userId) {
    await deleteAllUserRefreshTokens(userId);
    return;
  }
  if (plainToken) {
    const tokenHash = hashToken(plainToken);
    await deleteRefreshToken(tokenHash);
  }
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

// ── Forgot Password ───────────────────────────────────────────────────────────

/**
 * Initiate password reset flow.
 * Sends a reset email if the email exists (always returns success to avoid
 * leaking which emails are registered).
 */
const forgotPassword = async ({ email }) => {
  const user = await findUserByEmailRaw(email.toLowerCase().trim());

  // Always return success — never leak whether email exists
  if (!user || !user.isActive) return;

  // JWT signed with JWT_SECRET + user.passwordHash
  // This makes the token self-invalidating after the password is reset
  const secret    = `${process.env.JWT_SECRET}:${user.passwordHash}`;
  const resetToken = jwt.sign(
    { sub: user.id, type: "password_reset" },
    secret,
    { expiresIn: "1h" },
  );

  const displayName = user.employee?.name ?? user.email;
  const appUrl      = (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, "");
  const resetUrl    = `${appUrl}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(user.email, displayName, resetUrl);
};

// ── Reset Password ────────────────────────────────────────────────────────────

/**
 * Complete password reset using the JWT token from the reset email.
 */
const resetPassword = async ({ token, password }) => {
  // Step 1: Decode without verification to get userId
  let payload;
  try {
    payload = jwt.decode(token);
  } catch {
    throw new AppError("Token tidak valid", StatusCodes.BAD_REQUEST);
  }

  if (!payload || payload.type !== "password_reset" || !payload.sub) {
    throw new AppError("Token tidak valid", StatusCodes.BAD_REQUEST);
  }

  // Step 2: Fetch the user (we need passwordHash to reconstruct secret)
  const rawUser = await findUserByIdRaw(payload.sub);

  if (!rawUser || !rawUser.isActive) {
    throw new AppError("Token tidak valid atau akun tidak aktif", StatusCodes.BAD_REQUEST);
  }

  // Step 3: Verify the token with the user's current passwordHash as part of the secret
  // Using passwordHash as part of the secret makes this token self-invalidating after use
  const secret = `${process.env.JWT_SECRET}:${rawUser.passwordHash}`;
  try {
    jwt.verify(token, secret);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Link reset password sudah kadaluarsa. Silakan minta ulang.", StatusCodes.BAD_REQUEST);
    }
    throw new AppError("Token tidak valid", StatusCodes.BAD_REQUEST);
  }

  // Step 4: Hash the new password and update (this invalidates the token automatically)
  const newHash = await bcrypt.hash(password, 12);
  await updatePasswordHash(rawUser.id, newHash);
};

module.exports = { login, getMe, forgotPassword, resetPassword, refreshAccessToken, logout };
