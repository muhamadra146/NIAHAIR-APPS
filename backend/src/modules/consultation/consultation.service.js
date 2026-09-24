const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma     = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");
const {
  findAll,
  count,
  findById,
  findByInvoiceId,
  findUnfilledInvoices,
  isEmployeeAssignedToInvoice,
  create,
  update,
  remove,
  getStats,
} = require("./consultation.repository");

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "FINANCE"];

const isManager = (roleCode) => MANAGEMENT_ROLES.includes(roleCode);

// ── List (Semua Catatan) ───────────────────────────────────────────────────────

const listNotes = async ({ page, limit, customerId, branchId, filledByEmployeeId, startDate, endDate, search }, user) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};
  if (customerId)          where.customerId          = customerId;
  if (branchId)            where.branchId            = branchId;
  if (filledByEmployeeId)  where.filledByEmployeeId  = filledByEmployeeId;
  if (search) {
    where.customer = { name: { contains: search, mode: "insensitive" } };
  }

  if (startDate || endDate) {
    where.filledAt = {};
    if (startDate) where.filledAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.filledAt.lte = end;
    }
  }

  const [data, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Unfilled invoices (Tab "Isi Catatan") ─────────────────────────────────────

const getUnfilledInvoiceList = async ({ page, limit, branchId, search }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const { data, total } = await findUnfilledInvoices({
    branchId: branchId || undefined,
    search:   search   || undefined,
    skip,
    take,
  });
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

// ── Single ────────────────────────────────────────────────────────────────────

const getNoteById = async (id) => {
  const note = await findById(id);
  if (!note) throw new AppError("Catatan tidak ditemukan", StatusCodes.NOT_FOUND);
  return note;
};

const getNoteByInvoiceId = async (invoiceId) => {
  return findByInvoiceId(invoiceId);
};

// ── Create ────────────────────────────────────────────────────────────────────

const createNote = async (body, user) => {
  const { invoiceId, ...rest } = body;

  const invoice = await prisma.invoice.findUnique({
    where:  { id: invoiceId },
    select: { id: true, customerId: true, branchId: true, status: true },
  });
  if (!invoice) throw new AppError("Invoice tidak ditemukan", StatusCodes.NOT_FOUND);
  if (invoice.status === "CANCELLED") {
    throw new AppError("Invoice sudah dibatalkan", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const existing = await findByInvoiceId(invoiceId);
  if (existing) throw new AppError("Catatan untuk invoice ini sudah ada", StatusCodes.CONFLICT);

  if (!isManager(user.roleCode)) {
    const assigned = await isEmployeeAssignedToInvoice(invoiceId, user.employeeId);
    if (!assigned) {
      throw new AppError("Anda tidak memiliki akses ke invoice ini", StatusCodes.FORBIDDEN);
    }
  }

  return create({
    invoiceId,
    customerId:         invoice.customerId,
    branchId:           invoice.branchId,
    filledByEmployeeId: user.employeeId ?? null,
    filledAt:           new Date(),
    ...rest,
  });
};

// ── Update ────────────────────────────────────────────────────────────────────

const updateNote = async (id, body, user) => {
  const note = await findById(id);
  if (!note) throw new AppError("Catatan tidak ditemukan", StatusCodes.NOT_FOUND);

  if (!isManager(user.roleCode)) {
    const assigned = await isEmployeeAssignedToInvoice(note.invoiceId, user.employeeId);
    if (!assigned) {
      throw new AppError("Anda tidak memiliki akses ke catatan ini", StatusCodes.FORBIDDEN);
    }
  }

  const { invoiceId, ...rest } = body;
  return update(id, {
    ...rest,
    filledByEmployeeId: user.employeeId ?? note.filledByEmployeeId,
    filledAt:           new Date(),
  });
};

// ── Stats ─────────────────────────────────────────────────────────────────────

const getStatsData = async ({ branchId, startDate, endDate, month, year }) => {
  const where = {};
  if (branchId) where.branchId = branchId;

  if (month && year) {
    // Filter by bulan & tahun
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    where.filledAt = {
      gte: new Date(y, m - 1, 1),
      lte: new Date(y, m, 0, 23, 59, 59, 999),
    };
  } else if (startDate || endDate) {
    where.filledAt = {};
    if (startDate) where.filledAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.filledAt.lte = end;
    }
  }

  return getStats(where);
};

// ── Upload Foto Before/After ──────────────────────────────────────────────────

const uploadNotePhoto = async (id, { url, publicId, type }, user) => {
  const note = await findById(id);
  if (!note) throw new AppError("Catatan tidak ditemukan", StatusCodes.NOT_FOUND);

  if (!isManager(user.roleCode)) {
    const assigned = await isEmployeeAssignedToInvoice(note.invoiceId, user.employeeId);
    if (!assigned) {
      throw new AppError("Anda tidak memiliki akses ke catatan ini", StatusCodes.FORBIDDEN);
    }
  }

  if (type !== "BEFORE" && type !== "AFTER") {
    throw new AppError("type harus BEFORE atau AFTER", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const isBefore = type === "BEFORE";
  const urlField = isBefore ? "beforePhotoUrl"      : "afterPhotoUrl";
  const pidField = isBefore ? "beforePhotoPublicId" : "afterPhotoPublicId";

  if (note[pidField]) {
    await cloudinary.uploader.destroy(note[pidField]).catch(() => {});
  }

  return update(id, { [urlField]: url, [pidField]: publicId });
};

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteNote = async (id, user) => {
  const note = await findById(id);
  if (!note) throw new AppError("Catatan tidak ditemukan", StatusCodes.NOT_FOUND);

  if (!isManager(user.roleCode)) {
    const assigned = await isEmployeeAssignedToInvoice(note.invoiceId, user.employeeId);
    if (!assigned) {
      throw new AppError("Anda tidak memiliki akses ke catatan ini", StatusCodes.FORBIDDEN);
    }
  }

  await remove(id);
};

module.exports = {
  listNotes,
  getUnfilledInvoiceList,
  getNoteById,
  getNoteByInvoiceId,
  createNote,
  updateNote,
  uploadNotePhoto,
  deleteNote,
  getStatsData,
};
