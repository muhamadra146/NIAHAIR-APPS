const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma     = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");
const { wibDayStart, wibDayEnd } = require("../../utils/date");
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

// Hak akses Catatan Klien (keputusan owner 2026-10-17, lihat CRM-008):
//   Buat  : SUPER_ADMIN, OWNER, MANAGER, CASHIER — staf lain hanya bila terkait invoice-nya
//   Ubah/hapus (termasuk foto): penulis catatan, atau SUPER_ADMIN / OWNER / MANAGER
//   FINANCE, OFFICE (view-only) dan INVENTORY: hanya lihat
const SUPERVISOR_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER"];
const CREATE_ROLES     = [...SUPERVISOR_ROLES, "CASHIER"];
const VIEW_ONLY_ROLES  = ["FINANCE", "OFFICE", "INVENTORY"];

const assertCanCreate = async (invoiceId, user) => {
  if (VIEW_ONLY_ROLES.includes(user.roleCode)) {
    throw new AppError("Anda hanya dapat melihat catatan klien", StatusCodes.FORBIDDEN);
  }
  if (CREATE_ROLES.includes(user.roleCode)) return;
  const assigned = await isEmployeeAssignedToInvoice(invoiceId, user.employeeId);
  if (!assigned) {
    throw new AppError("Anda tidak memiliki akses ke invoice ini", StatusCodes.FORBIDDEN);
  }
};

const assertCanModify = (note, user) => {
  if (VIEW_ONLY_ROLES.includes(user.roleCode)) {
    throw new AppError("Anda hanya dapat melihat catatan klien", StatusCodes.FORBIDDEN);
  }
  if (SUPERVISOR_ROLES.includes(user.roleCode)) return;
  const isAuthor = !!user.employeeId && note.filledByEmployeeId === user.employeeId;
  if (!isAuthor) {
    throw new AppError(
      "Catatan hanya bisa diubah atau dihapus oleh penulisnya, Manager, Owner, atau Super Admin",
      StatusCodes.FORBIDDEN
    );
  }
};

// Pilihan "Lainnya" (OTHER) wajib disertai keterangan
const OTHER_TEXT_RULES = [
  { field: "profession",       textField: "professionOther",        label: "Profesi",                multi: false },
  { field: "dailyStyling",     textField: "dailyStylingOther",      label: "Styling sehari-hari",    multi: true  },
  { field: "discoveryChannel", textField: "discoveryChannelDetail", label: "Tau Nia Hair dari mana", multi: false },
  { field: "reasonForService", textField: "reasonForServiceOther",  label: "Alasan service",         multi: true  },
  { field: "hesitation",       textField: "hesitationOther",        label: "Yang bikin ragu",        multi: true  },
];

const assertOtherFilled = (data) => {
  for (const { field, textField, label, multi } of OTHER_TEXT_RULES) {
    const value   = data[field];
    const isOther = multi ? Array.isArray(value) && value.includes("OTHER") : value === "OTHER";
    if (isOther && !String(data[textField] ?? "").trim()) {
      throw new AppError(`Pilihan "Lainnya" pada ${label} wajib diisi keterangannya`, StatusCodes.UNPROCESSABLE_ENTITY);
    }
  }
};

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
    if (startDate) where.filledAt.gte = wibDayStart(startDate);
    if (endDate)   where.filledAt.lte = wibDayEnd(endDate);
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

  await assertCanCreate(invoiceId, user);
  assertOtherFilled(rest);

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

  assertCanModify(note, user);

  const { invoiceId, ...rest } = body;
  assertOtherFilled({ ...note, ...rest });

  // Penulis & tanggal isi asli tidak boleh tertimpa saat diedit (CRM-008) — updatedAt terisi otomatis
  return update(id, rest);
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
    if (startDate) where.filledAt.gte = wibDayStart(startDate);
    if (endDate)   where.filledAt.lte = wibDayEnd(endDate);
  }

  return getStats(where);
};

// ── Upload Foto Before/After ──────────────────────────────────────────────────

const uploadNotePhoto = async (id, { url, publicId, type }, user) => {
  const note = await findById(id);
  if (!note) throw new AppError("Catatan tidak ditemukan", StatusCodes.NOT_FOUND);

  assertCanModify(note, user);

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

  assertCanModify(note, user);

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
