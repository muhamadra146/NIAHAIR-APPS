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

// Klaim job secara atomik: PENDING → PROCESSING bersyarat.
// Return true jika berhasil diklaim; false jika runner lain sudah mengambilnya (G4-19).
const claimPending = async (id) => {
  const { count } = await prisma.syncQueue.updateMany({
    where: { id, status: "PENDING" },
    data:  { status: "PROCESSING", startedAt: new Date() },
  });
  return count === 1;
};

// Job untuk data yang sudah dihapus — selesai tanpa diproses (G1-30).
// Enum tidak punya SKIPPED, jadi ditandai SUCCESS + catatan di errorMessage.
const markSkipped = (id, reason) =>
  prisma.syncQueue.update({
    where: { id },
    data:  { status: "SUCCESS", errorMessage: String(reason).slice(0, 1000), processedAt: new Date() },
  });

// Model Prisma sumber per entityType — untuk cek data masih ada
const ENTITY_MODEL = {
  CUSTOMER:               "customer",
  ITEM:                   "item",
  DEPOSIT:                "deposit",
  INVOICE:                "invoice",
  PAYMENT:                "payment",
  DEPOSIT_PAYMENT:        "depositPayment",
  STOCK_TRANSFER:         "stockTransfer",
  STOCK_TRANSFER_RECEIVE: "stockTransfer",
  PURCHASE_INVOICE:       "purchaseInvoice",
  PURCHASE_RETURN:        "purchaseReturn",
  PAYROLL:                "payroll",
};

// true/false jika entityType dikenal; null jika tidak bisa dicek
const entityExists = async (entityType, entityId) => {
  const model = ENTITY_MODEL[entityType];
  if (!model || !entityId) return null;
  const row = await prisma[model].findUnique({ where: { id: entityId }, select: { id: true } });
  return !!row;
};

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

// ── Job PROCESSING yang macet (worker mati di tengah proses, mis. nodemon restart) ──
// Dianggap macet jika tidak diperbarui lebih dari STALE_PROCESSING_MINUTES (G5-03).
const STALE_PROCESSING_MINUTES = 10;
const staleCutoff = () => new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);

// Kembalikan job PROCESSING yang macet ke PENDING agar diambil worker lagi
const reclaimStaleProcessing = async () => {
  const { count } = await prisma.syncQueue.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleCutoff() } },
    data:  { status: "PENDING", startedAt: null },
  });
  return count;
};

// Manual retry reset — resets full execution state so findPending picks it up again.
// attempt resets to 0 so the job gets maxAttempt fresh retries.
// Bersyarat: hanya FAILED atau PROCESSING yang macet (G5-04) — SUCCESS tidak boleh di-reset
// karena akan push ulang ke Accurate (duplikat). Return true jika berhasil.
const retry = async (id) => {
  const { count } = await prisma.syncQueue.updateMany({
    where: {
      id,
      OR: [
        { status: "FAILED" },
        { status: "PROCESSING", updatedAt: { lt: staleCutoff() } },
      ],
    },
    data: {
      status:       "PENDING",
      attempt:      0,
      errorMessage: null,
      startedAt:    null,
      processedAt:  null,
    },
  });
  return count === 1;
};

module.exports = {
  create, findPending, findById, findAll, count,
  findExistingPending,
  markProcessing, claimPending, markSkipped, entityExists,
  markSuccess, markFailed, retry,
  reclaimStaleProcessing, STALE_PROCESSING_MINUTES,
};
