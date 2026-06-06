const prisma = require("../../config/prisma");

// ── Create ────────────────────────────────────────────────────────────

const create = (data) => prisma.syncQueue.create({ data });

// ── Read ──────────────────────────────────────────────────────────────

// Fetches PENDING jobs where attempt < maxAttempt, oldest first.
// Prisma cannot compare two columns in WHERE, so we overfetch and filter in JS.
// Overfetch by limit*4+20 to stay safe even if many stuck PENDING jobs exist.
const findPending = async (limit = 10) => {
  const rows = await prisma.syncQueue.findMany({
    where:   { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take:    limit * 4 + 20,
  });
  // Safety guard: skip any PENDING rows that have exhausted their attempts.
  // These are invalid state (should be FAILED) — repaired by repair-sync-queue script.
  return rows.filter((r) => r.attempt < r.maxAttempt).slice(0, limit);
};

const findById = (id) => prisma.syncQueue.findUnique({ where: { id } });

const findAll = ({ skip, take, where }) =>
  prisma.syncQueue.findMany({ skip, take, where, orderBy: { createdAt: "desc" } });

const count = (where) => prisma.syncQueue.count({ where });

// Duplicate-pending guard: same entity + direction already waiting
const findExistingPending = (entityType, entityId, direction) =>
  prisma.syncQueue.findFirst({
    where: { entityType, entityId, direction, status: "PENDING" },
    select: { id: true, entityType: true, entityId: true, status: true },
  });

// ── Status transitions ────────────────────────────────────────────────

const markProcessing = (id) =>
  prisma.syncQueue.update({
    where: { id },
    data:  { status: "PROCESSING", startedAt: new Date() },
  });

const markSuccess = (id) =>
  prisma.syncQueue.update({
    where: { id },
    data:  { status: "SUCCESS", processedAt: new Date() },
  });

// Increments attempt. Sets status=FAILED when nextAttempt >= maxAttempt, else PENDING.
// The two-read approach (read then write) is intentional:
//   - markProcessing already changed status to PROCESSING
//   - we read attempt/maxAttempt here to decide the next state
//   - if job is not found (deleted mid-flight) the update is a no-op
const markFailed = async (id, errorMessage) => {
  const job = await prisma.syncQueue.findUnique({
    where:  { id },
    select: { attempt: true, maxAttempt: true },
  });

  if (!job) return null;   // job was deleted between processing and failure — ignore

  const nextAttempt = job.attempt + 1;
  const exhausted   = nextAttempt >= job.maxAttempt;
  const nextStatus  = exhausted ? "FAILED" : "PENDING";

  return prisma.syncQueue.update({
    where: { id },
    data: {
      status:       nextStatus,
      attempt:      nextAttempt,
      errorMessage: String(errorMessage).slice(0, 1000),
      processedAt:  new Date(),
    },
  });
};

// Manual retry reset — resets full execution state so findPending picks it up again.
// attempt resets to 0 so the job gets maxAttempt fresh retries.
const retry = (id) =>
  prisma.syncQueue.update({
    where: { id },
    data: {
      status:       "PENDING",
      attempt:      0,
      errorMessage: null,
      startedAt:    null,
      processedAt:  null,
    },
  });

module.exports = {
  create, findPending, findById, findAll, count,
  findExistingPending,
  markProcessing, markSuccess, markFailed, retry,
};
