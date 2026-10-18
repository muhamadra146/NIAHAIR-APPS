const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { findAll, count, findById, findByCode, create, update, deleteById, countRulesByCategory, countJobsByCategory } = require("./commissionCategory.repository");

// Kode kategori: trim, huruf besar, spasi → "_" (sama dengan modul lain); hanya A-Z, 0-9, _
const CODE_RE = /^[A-Z0-9_]+$/;
const normalizeCode = (code) => {
  const c = String(code ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!c) throw new AppError("Kode wajib diisi", StatusCodes.UNPROCESSABLE_ENTITY);
  if (!CODE_RE.test(c)) {
    throw new AppError("Kode hanya boleh huruf, angka, dan garis bawah (_)", StatusCodes.UNPROCESSABLE_ENTITY);
  }
  return c;
};

const getAll = async ({ page, limit, search, isActive }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const where = {};

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [categories, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data: categories, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const category = await findById(id);
  if (!category) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  return category;
};

const createCommissionCategory = async (body) => {
  const code = normalizeCode(body.code);
  const existing = await findByCode(code);
  if (existing) throw new AppError("Kode kategori komisi sudah digunakan", StatusCodes.CONFLICT);

  return create({
    code,
    name:     body.name.trim(),
    isActive: body.isActive !== undefined ? body.isActive : true,
    allowAnyStaff: body.allowAnyStaff ?? false,
  });
};

const updateCommissionCategory = async (id, body) => {
  const category = await findById(id);
  if (!category) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  const data = { ...body };
  if (body.code !== undefined) {
    data.code = normalizeCode(body.code);
    if (data.code !== category.code) {
      const existing = await findByCode(data.code);
      if (existing) throw new AppError("Kode kategori komisi sudah digunakan", StatusCodes.CONFLICT);
    }
  }
  if (typeof body.name === "string") data.name = body.name.trim();

  return update(id, data);
};

const deleteCommissionCategory = async (id) => {
  const category = await findById(id);
  if (!category) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  const rulesCount = await countRulesByCategory(id);
  if (rulesCount > 0) {
    throw new AppError(
      `Kategori ini digunakan oleh ${rulesCount} rule komisi. Hapus rule terlebih dahulu.`,
      StatusCodes.CONFLICT
    );
  }

  // Job kategori ber-FK RESTRICT — tanpa cek ini DB menolak dan jadi error 500
  const jobsCount = await countJobsByCategory(id);
  if (jobsCount > 0) {
    throw new AppError(
      `Kategori masih dipakai oleh ${jobsCount} job; hapus/pindahkan job dulu`,
      StatusCodes.CONFLICT
    );
  }

  await deleteById(id);
};

module.exports = { getAll, getById, createCommissionCategory, updateCommissionCategory, deleteCommissionCategory };
