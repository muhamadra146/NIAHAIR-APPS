const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { findById: findCustomer } = require("./customer.repository");
const { findAllByCustomer, create, findById, update, remove } = require("./customerNote.repository");

// Roles yang boleh edit dan hapus catatan (CRM-008)
const CAN_MANAGE_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER"];

const getNotes = async (customerId, { skip, take } = {}) => {
  const customer = await findCustomer(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);
  return findAllByCustomer(customerId, { skip, take });
};

const createNote = async (customerId, body, createdByName) => {
  const customer = await findCustomer(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  return create({
    customerId,
    note:      body.note,
    createdBy: createdByName ?? null,
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
