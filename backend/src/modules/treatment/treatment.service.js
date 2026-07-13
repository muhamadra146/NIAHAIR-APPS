const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma = require("../../config/prisma");
const {
  findAll,
  count,
  findById,
  findCustomerById,
  findBranchById,
  findAppointmentById,
  create,
  update,
} = require("./treatment.repository");
const { syncInvoiceToAccurate } = require("../invoice/invoice.sync.service");

const getAll = async ({ page, limit, customerId, branchId, invoiceId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (customerId) where.customerId = customerId;
  if (branchId)   where.branchId   = branchId;
  if (invoiceId)  where.invoiceId  = invoiceId;

  if (startDate || endDate) {
    const WIB = 7 * 60 * 60 * 1000; // UTC+7
    where.startedAt = {};
    if (startDate) {
      const dayStart = new Date(`${startDate}T00:00:00.000Z`);
      where.startedAt.gte = new Date(dayStart.getTime() - WIB); // 00:00 WIB
    }
    if (endDate) {
      const dayStart = new Date(`${endDate}T00:00:00.000Z`);
      where.startedAt.lte = new Date(dayStart.getTime() - WIB + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999 WIB
    }
  }

  const [sessions, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data: sessions,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const session = await findById(id);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);
  return session;
};

const createSession = async (body) => {
  const { customerId, branchId, appointmentId, startedAt, notes } = body;

  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  if (appointmentId) {
    const appointment = await findAppointmentById(appointmentId);
    if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);
  }

  const data = {
    customerId,
    branchId,
    notes: notes ?? null,
    ...(appointmentId && { appointmentId }),
    ...(startedAt     && { startedAt: new Date(startedAt) }),
  };

  return create(data);
};

const updateSession = async (id, body) => {
  const session = await findById(id);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

  const { completedAt, notes } = body;

  // Blokir uncomplete jika invoice sudah di-sync ke Accurate (material sudah masuk Accurate)
  const isBeingUncompleted = completedAt === null && session.completedAt && session.invoiceId;
  if (isBeingUncompleted) {
    const invoice = await prisma.invoice.findUnique({
      where:  { id: session.invoiceId },
      select: { accurateInvoiceId: true },
    });
    if (invoice?.accurateInvoiceId) {
      throw new AppError(
        "Treatment tidak dapat dibatalkan selesai karena invoice sudah tersinkronisasi ke Accurate. Data material sudah terkirim dan tidak dapat di-reverse otomatis.",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  const data = {};
  if (completedAt !== undefined) data.completedAt = completedAt ? new Date(completedAt) : null;
  if (notes       !== undefined) data.notes       = notes;

  const updated = await update(id, data);

  // Saat treatment selesai, re-sync invoice ke Accurate agar material usage ikut masuk
  const isBeingCompleted = completedAt && !session.completedAt && session.invoiceId;
  if (isBeingCompleted) {
    syncInvoiceToAccurate(session.invoiceId).catch((err) => {
      console.warn(`[treatment complete] Accurate re-sync failed for invoice ${session.invoiceId}: ${err.message}`);
    });
  }

  return updated;
};

module.exports = { getAll, getById, createSession, updateSession };
