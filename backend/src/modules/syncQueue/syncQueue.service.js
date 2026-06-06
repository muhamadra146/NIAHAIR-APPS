const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  create, findAll, count, findById,
  findExistingPending, retry,
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
  if (!job) throw new AppError("Sync job not found", StatusCodes.NOT_FOUND);

  if (job.status === "PENDING" || job.status === "PROCESSING") {
    throw new AppError(
      `Cannot retry a job with status ${job.status}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return retry(id);
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
