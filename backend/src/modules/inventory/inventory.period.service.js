const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const repo            = require("./inventory.period.repository");

// Guard: throws 422 if the period for a given date is CLOSED.
// Called before any movement creation to enforce the closing rule.
const validatePeriodOpen = async (date) => {
  const d     = date instanceof Date ? date : new Date(date);
  const year  = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;

  const period = await repo.findPeriod(year, month);
  if (period && period.status === "CLOSED") {
    throw new AppError(
      `Inventory period ${year}-${String(month).padStart(2, "0")} is closed.`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};

const closePeriod = async (year, month, closedByEmployeeId) => {
  const existing = await repo.findPeriod(year, month);
  if (existing && existing.status === "CLOSED") {
    throw new AppError(
      `Inventory period ${year}-${String(month).padStart(2, "0")} is already closed.`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
  return repo.closePeriod(year, month, closedByEmployeeId);
};

const reopenPeriod = async (year, month) => {
  const existing = await repo.findPeriod(year, month);
  if (!existing || existing.status === "OPEN") {
    throw new AppError(
      `Inventory period ${year}-${String(month).padStart(2, "0")} is not closed.`,
      StatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
  return repo.reopenPeriod(year, month);
};

module.exports = { validatePeriodOpen, closePeriod, reopenPeriod };
