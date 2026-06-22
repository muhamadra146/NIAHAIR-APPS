const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const repo     = require("./holiday.repository");

const toDateOnly = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getAll = async ({ year }) => {
  return repo.findAll({ year });
};

const getById = async (id) => {
  const holiday = await repo.findById(id);
  if (!holiday) throw new AppError("Holiday not found", StatusCodes.NOT_FOUND);
  return holiday;
};

const create = async ({ date, name }) => {
  const d = toDateOnly(new Date(date));
  const existing = await repo.findByDate(d);
  if (existing) throw new AppError("Sudah ada libur pada tanggal tersebut", StatusCodes.CONFLICT);
  return repo.create({ date: d, name, year: d.getUTCFullYear() });
};

const update = async (id, { date, name }) => {
  const holiday = await repo.findById(id);
  if (!holiday) throw new AppError("Holiday not found", StatusCodes.NOT_FOUND);

  const data = {};
  if (name !== undefined) data.name = name;
  if (date !== undefined) {
    const d = toDateOnly(new Date(date));
    const existing = await repo.findByDate(d);
    if (existing && existing.id !== id) throw new AppError("Sudah ada libur pada tanggal tersebut", StatusCodes.CONFLICT);
    data.date = d;
    data.year = d.getUTCFullYear();
  }

  return repo.update(id, data);
};

const remove = async (id) => {
  const holiday = await repo.findById(id);
  if (!holiday) throw new AppError("Holiday not found", StatusCodes.NOT_FOUND);
  await repo.remove(id);
  return { deleted: true };
};

module.exports = { getAll, getById, create, update, remove };
