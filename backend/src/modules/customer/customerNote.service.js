const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { findById: findCustomer } = require("./customer.repository");
const {
  findAllByCustomer, create, findById, update, remove, findAuthorNameByUserId, findAuthorNamesByEmails,
} = require("./customerNote.repository");

// Roles yang boleh edit dan hapus catatan (CRM-008)
const CAN_MANAGE_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER"];

const isEmail = (v) => typeof v === "string" && v.includes("@");

const getNotes = async (customerId, { skip, take } = {}) => {
  const customer = await findCustomer(customerId);
  if (!customer) throw new AppError("Customer tidak ditemukan", StatusCodes.NOT_FOUND);
  const notes = await findAllByCustomer(customerId, { skip, take });

  // Catatan lama menyimpan email penulis — tampilkan nama karyawannya (B7)
  const emails = [...new Set(notes.map((n) => n.createdBy).filter(isEmail).map((e) => e.toLowerCase()))];
  if (emails.length === 0 || !findAuthorNamesByEmails) return notes;
  const names = await findAuthorNamesByEmails(emails);
  return notes.map((n) => (isEmail(n.createdBy) && names[n.createdBy.toLowerCase()]
    ? { ...n, createdBy: names[n.createdBy.toLowerCase()] }
    : n));
};

/** author: { userId, fallback } — nama karyawan pemilik akun; fallback bila tidak ada */
const createNote = async (customerId, body, author) => {
  const customer = await findCustomer(customerId);
  if (!customer) throw new AppError("Customer tidak ditemukan", StatusCodes.NOT_FOUND);

  const createdBy = typeof author === "object" && author !== null
    ? (findAuthorNameByUserId ? await findAuthorNameByUserId(author.userId) : null) ?? author.fallback ?? null
    : author ?? null;

  return create({
    customerId,
    note:      body.note.trim(),
    createdBy,
  });
};

const updateNote = async (customerId, noteId, body, userRole) => {
  const note = await findById(noteId);
  if (!note) throw new AppError("Note tidak ditemukan", StatusCodes.NOT_FOUND);
  if (note.customerId !== customerId) throw new AppError("Note tidak ditemukan", StatusCodes.NOT_FOUND);

  // CRM-008: hanya SUPER_ADMIN / OWNER / MANAGER yang boleh edit catatan
  if (!CAN_MANAGE_ROLES.includes(userRole)) {
    throw new AppError("Tidak memiliki akses untuk mengubah catatan ini", StatusCodes.FORBIDDEN);
  }

  return update(noteId, { note: body.note });
};

const deleteNote = async (customerId, noteId, userRole) => {
  const note = await findById(noteId);
  if (!note) throw new AppError("Note tidak ditemukan", StatusCodes.NOT_FOUND);
  if (note.customerId !== customerId) throw new AppError("Note tidak ditemukan", StatusCodes.NOT_FOUND);

  // CRM-008: hanya SUPER_ADMIN / OWNER / MANAGER yang boleh hapus catatan
  if (!CAN_MANAGE_ROLES.includes(userRole)) {
    throw new AppError("Tidak memiliki akses untuk menghapus catatan ini", StatusCodes.FORBIDDEN);
  }

  return remove(noteId);
};

module.exports = { getNotes, createNote, updateNote, deleteNote };
