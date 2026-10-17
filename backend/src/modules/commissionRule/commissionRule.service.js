const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");

const ORDER_MAP = {
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  isActive:     { isActive: "asc" },
  "-isActive":  { isActive: "desc" },
};
const {
  findAll,
  count,
  findById,
  findActiveByEmployeeAndCategory,
  findDuplicate,
  findEmployeeById,
  findCommissionCategoryById,
  findCommissionJobById,
  create,
  update,
  deleteById,
} = require("./commissionRule.repository");

const getAll = async ({ page, limit, search, employeeId, commissionCategoryId, isActive, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);
  const where = {};

  if (search) {
    where.OR = [
      { employee:           { name: { contains: search, mode: "insensitive" } } },
      { commissionCategory: { name: { contains: search, mode: "insensitive" } } },
      { commissionCategory: { code: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (employeeId)           where.employeeId           = employeeId;
  if (commissionCategoryId) where.commissionCategoryId = commissionCategoryId;

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  const [rules, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
    count(where),
  ]);

  return { data: rules, meta: paginationMeta(total, pageNum, limitNum) };
};

const getById = async (id) => {
  const rule = await findById(id);
  if (!rule) throw new AppError("Aturan komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  return rule;
};

// ── Validasi nilai efektif (kiriman digabung dengan data tersimpan) ──

const assertPercentRange = (type, value) => {
  if (type === "PERCENTAGE" && Number(value) > 100) {
    throw new AppError("Komisi persen tidak boleh lebih dari 100", StatusCodes.BAD_REQUEST);
  }
};

const toDate = (value, label) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError(`${label} tidak valid`, StatusCodes.BAD_REQUEST);
  return d;
};

const assertDateOrder = (effectiveDate, endDate) => {
  if (!endDate) return;
  if (toDate(endDate, "Tanggal berakhir") < toDate(effectiveDate, "Tanggal berlaku")) {
    throw new AppError("Tanggal berakhir tidak boleh sebelum tanggal berlaku", StatusCodes.BAD_REQUEST);
  }
};

// Job harus milik kategori rule
const assertJobInCategory = async (commissionJobId, commissionCategoryId) => {
  if (!commissionJobId) return;
  const job = await findCommissionJobById(commissionJobId);
  if (!job) throw new AppError("Job komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  if (job.commissionCategoryId !== commissionCategoryId) {
    throw new AppError("Job komisi bukan bagian dari kategori yang dipilih", StatusCodes.BAD_REQUEST);
  }
};

const createCommissionRule = async (body) => {
  const employee = await findEmployeeById(body.employeeId);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);

  const category = await findCommissionCategoryById(body.commissionCategoryId);
  if (!category) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  assertPercentRange(body.commissionType, body.commissionValue);
  assertDateOrder(body.effectiveDate, body.endDate);
  await assertJobInCategory(body.commissionJobId, body.commissionCategoryId);

  const slotKey        = body.slotKey        ?? null;
  const commissionJobId = body.commissionJobId ?? null;

  const duplicate = await findDuplicate(body.employeeId, body.commissionCategoryId, slotKey, body.effectiveDate, commissionJobId);
  if (duplicate) {
    throw new AppError(
      "Rule komisi dengan karyawan, kategori, role, dan tanggal berlaku yang sama sudah ada",
      StatusCodes.CONFLICT
    );
  }

  return create({
    employeeId:           body.employeeId,
    commissionCategoryId: body.commissionCategoryId,
    slotKey,
    commissionJobId,
    commissionType:       body.commissionType,
    commissionValue:      body.commissionValue,
    commissionBase:       body.commissionBase ?? "AFTER_DISCOUNT_BEFORE_TAX",
    effectiveDate:        new Date(body.effectiveDate),
    endDate:              body.endDate ? new Date(body.endDate) : undefined,
    isActive:             body.isActive !== undefined ? body.isActive : true,
  });
};

const updateCommissionRule = async (id, body) => {
  const rule = await findById(id);
  if (!rule) throw new AppError("Aturan komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  if (body.employeeId && body.employeeId !== rule.employeeId) {
    const employee = await findEmployeeById(body.employeeId);
    if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  }

  if (body.commissionCategoryId && body.commissionCategoryId !== rule.commissionCategoryId) {
    const category = await findCommissionCategoryById(body.commissionCategoryId);
    if (!category) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  }

  // Nilai efektif setelah digabung — mis. ganti FIXED → PERCENTAGE tanpa nilai baru tetap dicek
  assertPercentRange(
    body.commissionType ?? rule.commissionType,
    body.commissionValue ?? rule.commissionValue,
  );
  assertDateOrder(
    body.effectiveDate ?? rule.effectiveDate,
    body.endDate !== undefined ? body.endDate : rule.endDate,
  );
  await assertJobInCategory(
    body.commissionJobId !== undefined ? body.commissionJobId : rule.commissionJobId,
    body.commissionCategoryId ?? rule.commissionCategoryId,
  );

  const updateData = { ...body };
  if (updateData.effectiveDate) updateData.effectiveDate = new Date(updateData.effectiveDate);
  if (updateData.endDate)       updateData.endDate       = new Date(updateData.endDate);

  return update(id, updateData);
};

const deleteCommissionRule = async (id) => {
  const rule = await findById(id);
  if (!rule) throw new AppError("Aturan komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  await deleteById(id);
};

module.exports = { getAll, getById, createCommissionRule, updateCommissionRule, deleteCommissionRule };
