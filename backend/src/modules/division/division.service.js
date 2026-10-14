const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const repo = require("./division.repository");

const normalizeCode = (code) => String(code).trim().toUpperCase().replace(/\s+/g, "_");

const getAll = ({ includeInactive } = {}) =>
  repo.findAll({ includeInactive: includeInactive === "true" || includeInactive === true });

const getById = async (id) => {
  const division = await repo.findById(id);
  if (!division) throw new AppError("Divisi tidak ditemukan", StatusCodes.NOT_FOUND);
  return division;
};

const createDivision = async ({ code, name, isActive }) => {
  const c = normalizeCode(code);
  if (await repo.findByCode(c)) throw new AppError("Kode divisi sudah digunakan", StatusCodes.CONFLICT);
  return repo.create({ code: c, name: name.trim(), isActive: isActive ?? true });
};

const updateDivision = async (id, { code, name, isActive }) => {
  await getById(id);
  const data = {};
  if (code !== undefined) {
    const c = normalizeCode(code);
    const dup = await repo.findByCode(c);
    if (dup && dup.id !== id) throw new AppError("Kode divisi sudah digunakan", StatusCodes.CONFLICT);
    data.code = c;
  }
  if (name     !== undefined) data.name     = name.trim();
  if (isActive !== undefined) data.isActive = isActive;
  return repo.update(id, data);
};

module.exports = { getAll, getById, createDivision, updateDivision };
