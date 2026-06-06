const { StatusCodes } = require("http-status-codes");
const AppError = require("../common/errors/AppError");
const prisma   = require("../config/prisma");
const { ROLES } = require("../common/constants/role.constant");

// Reads the active branch from the X-Branch-Id request header.
// SUPER_ADMIN: any branch ID is accepted without a DB check.
// All others:  must have an active EmployeeBranch row for that branch.
// Sets req.branchId on success so downstream handlers use it directly.

const requireBranch = async (req, res, next) => {
  try {
    const branchId = req.headers["x-branch-id"];

    if (!branchId) {
      return next(
        new AppError("x-branch-id header is required", StatusCodes.BAD_REQUEST)
      );
    }

    if (req.user.roleCode === ROLES.SUPER_ADMIN) {
      req.branchId = branchId;
      return next();
    }

    if (!req.user.employeeId) {
      return next(
        new AppError(
          "User has no employee profile — branch access denied",
          StatusCodes.FORBIDDEN
        )
      );
    }

    const access = await prisma.employeeBranch.findFirst({
      where: {
        employeeId: req.user.employeeId,
        branchId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!access) {
      return next(
        new AppError(
          "Access to this branch is not allowed",
          StatusCodes.FORBIDDEN
        )
      );
    }

    req.branchId = branchId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireBranch;
