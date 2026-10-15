const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  create, findAll, count, findById,
  findExistingPending, retry, STALE_PROCESSING_MINUTES,
} = require("./syncQueue.repository");

// ── Create ────────────────────────────────────────────────────────────

const createSyncJob = async ({ entityType, entityId, direction, payload }) => {
  // Dedup: if a PENDING job for the same entity+direction already exists, return it
  if (entityId) {
    const existing = await findExistingPending(entityType, entityId, direction);
    if (existing) return { job: existing, created: false };
  }

  const job = await create({ entityType, entityId: entityId ?? null, direction, payload: payload ?? null });
  return { job, created: true };
};

// ── Retry ─────────────────────────────────────────────────────────────

const retrySync = async (id) => {
  const job = await findById(id);
  if (!job) throw new AppError("Antrian sync tidak ditemukan", StatusCodes.NOT_FOUND);

  // Hanya FAILED, atau PROCESSING yang macet > STALE_PROCESSING_MINUTES (G5-03/G5-04).
  // SUCCESS tidak boleh diulang — akan push ulang ke Accurate (dokumen duplikat).
  const staleMs  = STALE_PROCESSING_MINUTES * 60 * 1000;
  const isStale  = job.status === "PROCESSING" && new Date(job.updatedAt).getTime() < Date.now() - staleMs;
  if (job.status !== "FAILED" && !isStale) {
    throw new AppError(
      job.status === "PROCESSING"
        ? "Job sedang diproses, belum bisa diulang"
        : "Hanya job berstatus FAILED yang bisa diulang",
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  // Update bersyarat — jika status berubah di antara cek dan reset, tolak
  const reset = await retry(id);
  if (!reset) throw new AppError("Status job sudah berubah, muat ulang data", StatusCodes.CONFLICT);
  return findById(id);
};

// ── List ──────────────────────────────────────────────────────────────

const listSyncQueues = async ({ page, limit, status, entityType, direction }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (status)     where.status     = status;
  if (entityType) where.entityType = entityType;
  if (direction)  where.direction  = direction;

  const [data, total] = await Promise.all([findAll({ skip, take, where }), count(where)]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

module.exports = { createSyncJob, retrySync, listSyncQueues };
