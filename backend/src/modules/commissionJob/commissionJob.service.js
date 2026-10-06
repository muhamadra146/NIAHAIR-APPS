const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const prisma   = require("../../config/prisma");
const { paginate, paginationMeta } = require("../../utils/pagination");
const repo     = require("./commissionJob.repository");

const SPLIT_MODES  = ["BY_QTY", "EQUAL", "FULL"];
const DEFAULT_QTYS = ["ITEM_QTY", "ONE"];

// Validasi enum opsional — undefined = tidak diubah
const assertEnum = (value, allowed, field) => {
  if (value === undefined) return;
  if (!allowed.includes(value)) {
    throw new AppError(`${field} harus salah satu dari: ${allowed.join(", ")}`, StatusCodes.BAD_REQUEST);
  }
};

const RATE_TYPES = ["PERCENTAGE", "FIXED"];

// Tarif bawaan job + tingkatan jumlah staf (COM-013). Mengembalikan field yang berubah saja.
//   defaultCommissionType  : "PERCENTAGE" | "FIXED" | null
//   defaultCommissionValue : number ≥ 0 | null   (persen ≤ 100)
//   rateTiers              : [{ maxStaff: int ≥ 1 | null, value: number ≥ 0 }]  — null maxStaff = "lebih dari itu"
const normalizeRate = (body, current = {}) => {
  const out = {};
  if (body.defaultCommissionType !== undefined) {
    if (body.defaultCommissionType !== null) assertEnum(body.defaultCommissionType, RATE_TYPES, "defaultCommissionType");
    out.defaultCommissionType = body.defaultCommissionType ?? null;
  }
  const type = out.defaultCommissionType !== undefined ? out.defaultCommissionType : current.defaultCommissionType ?? null;

  const checkValue = (v, label) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new AppError(`${label} harus angka ≥ 0`, StatusCodes.BAD_REQUEST);
    if (type === "PERCENTAGE" && n > 100) throw new AppError(`${label} (persen) maksimal 100`, StatusCodes.BAD_REQUEST);
    return n;
  };

  if (body.defaultCommissionValue !== undefined) {
    out.defaultCommissionValue = body.defaultCommissionValue === null || body.defaultCommissionValue === ""
      ? null : checkValue(body.defaultCommissionValue, "Tarif bawaan");
  }

  if (body.rateTiers !== undefined) {
    const tiers = Array.isArray(body.rateTiers) ? body.rateTiers : [];
    if (tiers.length > 0 && !type) {
      throw new AppError("Pilih jenis tarif (persen / nominal) sebelum mengisi tingkatan", StatusCodes.BAD_REQUEST);
    }
    const seen = new Set();
    out.rateTiers = tiers.map((t, i) => {
      const maxStaff = t.maxStaff === null || t.maxStaff === "" || t.maxStaff === undefined ? null : Number(t.maxStaff);
      if (maxStaff !== null && (!Number.isInteger(maxStaff) || maxStaff < 1)) {
        throw new AppError(`Tingkatan #${i + 1}: jumlah staf harus bilangan bulat ≥ 1`, StatusCodes.BAD_REQUEST);
      }
      const key = maxStaff ?? "lebih";
      if (seen.has(key)) throw new AppError("Batas jumlah staf pada tingkatan tidak boleh sama", StatusCodes.BAD_REQUEST);
      seen.add(key);
      return { maxStaff, value: checkValue(t.value, `Tarif tingkatan #${i + 1}`) };
    });
  }
  return out;
};

const sanitizeKey = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_").replace(/^_|_$/g, "");

// ── List ──────────────────────────────────────────────────────────────

const listJobs = async (categoryId, { all = false, page, limit } = {}) => {
  const cat = await prisma.commissionCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!cat) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  const includeInactive = all === "true" || all === true;
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    repo.findAllByCategory(categoryId, includeInactive, { skip, take }),
    repo.countByCategory(categoryId, includeInactive),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Create ────────────────────────────────────────────────────────────

const createJob = async (categoryId, body) => {
  const cat = await prisma.commissionCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!cat) throw new AppError("Kategori komisi tidak ditemukan", StatusCodes.NOT_FOUND);

  const { name, jobKey: rawKey, sortOrder = 0, deductsFromJobId, pricePerUnit, unit, splitMode, defaultQty } = body;
  const jobKey = rawKey ? sanitizeKey(rawKey) : sanitizeKey(name);

  if (!name || !jobKey) throw new AppError("name wajib diisi", StatusCodes.BAD_REQUEST);
  assertEnum(splitMode,  SPLIT_MODES,  "splitMode");
  assertEnum(defaultQty, DEFAULT_QTYS, "defaultQty");

  const rate = normalizeRate(body);

  const existing = await repo.findByKey(categoryId, jobKey);
  if (existing) throw new AppError(`Job key "${jobKey}" sudah ada di kategori ini`, StatusCodes.CONFLICT);

  // Validasi deductsFromJobId: harus job dalam kategori yang sama
  if (deductsFromJobId) {
    const target = await repo.findById(deductsFromJobId);
    if (!target || target.commissionCategoryId !== categoryId) {
      throw new AppError("deductsFromJobId harus merujuk job dalam kategori yang sama", StatusCodes.BAD_REQUEST);
    }
  }

  return repo.create({
    commissionCategoryId: categoryId,
    name,
    jobKey,
    sortOrder,
    deductsFromJobId: deductsFromJobId ?? null,
    pricePerUnit:     pricePerUnit != null ? pricePerUnit : null,
    unit:             unit ? String(unit).trim() : "helai",
    ...(splitMode  && { splitMode }),
    ...(defaultQty && { defaultQty }),
    ...(rate.defaultCommissionType  !== undefined && { defaultCommissionType:  rate.defaultCommissionType }),
    ...(rate.defaultCommissionValue !== undefined && { defaultCommissionValue: rate.defaultCommissionValue }),
  }, rate.rateTiers);
};

// ── Update ────────────────────────────────────────────────────────────

const updateJob = async (categoryId, id, body) => {
  const job = await repo.findById(id);
  if (!job || job.commissionCategoryId !== categoryId) {
    throw new AppError("Job komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  }

  const data = {};
  if (body.name             !== undefined) data.name             = body.name;
  if (body.sortOrder        !== undefined) data.sortOrder        = Number(body.sortOrder);
  if (body.isActive         !== undefined) data.isActive         = body.isActive;
  if (body.pricePerUnit  !== undefined) data.pricePerUnit = body.pricePerUnit != null ? body.pricePerUnit : null;
  if (body.unit          !== undefined) data.unit         = body.unit ? String(body.unit).trim() : "helai";
  assertEnum(body.splitMode,  SPLIT_MODES,  "splitMode");
  assertEnum(body.defaultQty, DEFAULT_QTYS, "defaultQty");
  if (body.splitMode  !== undefined) data.splitMode  = body.splitMode;
  if (body.defaultQty !== undefined) data.defaultQty = body.defaultQty;
  const rate = normalizeRate(body, job);
  if (rate.defaultCommissionType  !== undefined) data.defaultCommissionType  = rate.defaultCommissionType;
  if (rate.defaultCommissionValue !== undefined) data.defaultCommissionValue = rate.defaultCommissionValue;

  // deductsFromJobId: validasi tidak boleh menunjuk ke diri sendiri + harus kategori sama
  if (body.deductsFromJobId !== undefined) {
    if (body.deductsFromJobId === id) {
      throw new AppError("Job tidak bisa memotong dirinya sendiri", StatusCodes.BAD_REQUEST);
    }
    if (body.deductsFromJobId) {
      const target = await repo.findById(body.deductsFromJobId);
      if (!target || target.commissionCategoryId !== categoryId) {
        throw new AppError("deductsFromJobId harus merujuk job dalam kategori yang sama", StatusCodes.BAD_REQUEST);
      }
    }
    data.deductsFromJobId = body.deductsFromJobId ?? null;
  }

  return repo.update(id, data, rate.rateTiers);
};

// ── Delete ────────────────────────────────────────────────────────────

const deleteJob = async (categoryId, id) => {
  const job = await repo.findById(id);
  if (!job || job.commissionCategoryId !== categoryId) {
    throw new AppError("Job komisi tidak ditemukan", StatusCodes.NOT_FOUND);
  }

  const [ruleCount, assignCount] = await Promise.all([
    repo.countRules(id),
    repo.countAssignments(id),
  ]);

  if (ruleCount > 0) {
    throw new AppError(
      `Job digunakan oleh ${ruleCount} rule komisi. Hapus rule terlebih dahulu.`,
      StatusCodes.CONFLICT
    );
  }
  if (assignCount > 0) {
    throw new AppError(
      `Job sudah digunakan dalam ${assignCount} assignment komisi dan tidak bisa dihapus.`,
      StatusCodes.CONFLICT
    );
  }

  return repo.hardDelete(id);
};

module.exports = { listJobs, createJob, updateJob, deleteJob };
