const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { findById: findCustomer } = require("./customer.repository");
const { findAllByCustomer, create, findById, remove } = require("./customerNote.repository");

const getNotes = async (customerId) => {
  const customer = await findCustomer(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);
  return findAllByCustomer(customerId);
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

const deleteNote = async (customerId, noteId, userRole) => {
  const note = await findById(noteId);
  if (!note) throw new AppError("Note not found", StatusCodes.NOT_FOUND);
  if (note.customerId !== customerId) throw new AppError("Note tidak ditemukan", StatusCodes.NOT_FOUND);

  // CRM-008: Note tidak boleh diubah tanpa audit. Only SUPER_ADMIN / OWNER / MANAGER can delete.
  const canDelete = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(userRole);
  if (!canDelete) throw new AppError("Tidak memiliki akses untuk menghapus catatan ini", StatusCodes.FORBIDDEN);

  return remove(noteId);
};

module.exports = { getNotes, createNote, deleteNote };
