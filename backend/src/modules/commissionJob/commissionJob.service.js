const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const prisma   = require("../../config/prisma");
const repo     = require("./commissionJob.repository");

const sanitizeKey = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_").replace(/^_|_$/g, "");

// ── List ──────────────────────────────────────────────────────────────

const listJobs = async (categoryId, { all = false } = {}) => {
  const cat = await prisma.commissionCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!cat) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);

  return repo.findAllByCategory(categoryId, all === "true" || all === true);
};

// ── Create ────────────────────────────────────────────────────────────

const createJob = async (categoryId, body) => {
  const cat = await prisma.commissionCategory.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!cat) throw new AppError("Commission category not found", StatusCodes.NOT_FOUND);

  const { name, jobKey: rawKey, sortOrder = 0, deductsFromJobId, pricePerUnit, unit } = body;
  const jobKey = rawKey ? sanitizeKey(rawKey) : sanitizeKey(name);

  if (!name || !jobKey) throw new AppError("name wajib diisi", StatusCodes.BAD_REQUEST);

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
    unit:             unit           ? String(unit).trim() : "helai",
  });
};

// ── Update ────────────────────────────────────────────────────────────

const updateJob = async (categoryId, id, body) => {
  const job = await repo.findById(id);
  if (!job || job.commissionCategoryId !== categoryId) {
    throw new AppError("Commission job not found", StatusCodes.NOT_FOUND);
  }

  const data = {};
  if (body.name             !== undefined) data.name             = body.name;
  if (body.sortOrder        !== undefined) data.sortOrder        = Number(body.sortOrder);
  if (body.isActive         !== undefined) data.isActive         = body.isActive;
  if (body.pricePerUnit     !== undefined) data.pricePerUnit     = body.pricePerUnit != null ? body.pricePerUnit : null;
  if (body.unit             !== undefined) data.unit             = body.unit ? String(body.unit).trim() : "helai";

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

  return repo.update(id, data);
};

// ── Delete ────────────────────────────────────────────────────────────

const deleteJob = async (categoryId, id) => {
  const job = await repo.findById(id);
  if (!job || job.commissionCategoryId !== categoryId) {
    throw new AppError("Commission job not found", StatusCodes.NOT_FOUND);
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
