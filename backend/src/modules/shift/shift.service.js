const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const repo            = require("./shift.repository");

const LOCKED_FIELDS = ["code", "startTime", "endTime", "isWorking"];

const getAll = async ({ isActive } = {}) => {
  const where = {};
  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }
  const [shifts, usedIds] = await Promise.all([
    repo.findAll({ where }),
    repo.findUsedShiftIds(),
  ]);
  return shifts.map((s) => ({ ...s, isUsed: usedIds.has(s.id) }));
};

const getById = async (id) => {
  const [shift, isUsed] = await Promise.all([repo.findById(id), repo.isShiftUsed(id)]);
  if (!shift) throw new AppError("Shift not found", StatusCodes.NOT_FOUND);
  return { ...shift, isUsed };
};

const createShift = async (body) => {
  const existing = await repo.findByCode(body.code);
  if (existing) throw new AppError("Shift code already exists", StatusCodes.CONFLICT);
  const shift = await repo.create({
    code:      body.code,
    name:      body.name,
    startTime: body.startTime ?? null,
    endTime:   body.endTime   ?? null,
    color:     body.color     ?? null,
    isWorking: body.isWorking ?? true,
  });
  return { ...shift, isUsed: false };
};

const updateShift = async (id, body) => {
  const shift = await repo.findById(id);
  if (!shift) throw new AppError("Shift not found", StatusCodes.NOT_FOUND);

  const isUsed = await repo.isShiftUsed(id);

  if (isUsed) {
    const attemptedLocked = LOCKED_FIELDS.filter(
      (f) => body[f] !== undefined && body[f] !== shift[f],
    );
    if (attemptedLocked.length > 0) {
      throw new AppError(
        "Cannot change working time because shift already has schedules. Create a new shift instead.",
        StatusCodes.UNPROCESSABLE_ENTITY,
      );
    }
  }

  if (!isUsed && body.code && body.code !== shift.code) {
    const dup = await repo.findByCode(body.code);
    if (dup) throw new AppError("Shift code already exists", StatusCodes.CONFLICT);
  }

  const data = {};
  // Always editable
  if (body.name     !== undefined) data.name     = body.name;
  if (body.color    !== undefined) data.color    = body.color    ?? null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  // Only editable when unused
  if (!isUsed) {
    if (body.code      !== undefined) data.code      = body.code;
    if (body.startTime !== undefined) data.startTime = body.startTime ?? null;
    if (body.endTime   !== undefined) data.endTime   = body.endTime   ?? null;
    if (body.isWorking !== undefined) data.isWorking = body.isWorking;
  }

  const updated = await repo.update(id, data);
  return { ...updated, isUsed };
};

module.exports = { getAll, getById, createShift, updateShift };
