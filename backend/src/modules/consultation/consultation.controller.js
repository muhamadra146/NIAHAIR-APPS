const { success, created } = require("../../common/responses/apiResponse");
const {
  listNotes,
  getNoteById,
  getNoteByInvoiceId,
  createNote,
  updateNote,
  deleteNote,
  getStatsData,
} = require("./consultation.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listNotes(req.query);
    return success(res, result, "Catatan fetched");
  } catch (err) {
    next(err);
  }
};

const getByIdController = async (req, res, next) => {
  try {
    const result = await getNoteById(req.params.id);
    return success(res, result, "Catatan fetched");
  } catch (err) {
    next(err);
  }
};

const getByInvoiceController = async (req, res, next) => {
  try {
    const result = await getNoteByInvoiceId(req.params.invoiceId);
    return success(res, result ?? null, "Catatan fetched");
  } catch (err) {
    next(err);
  }
};

const createController = async (req, res, next) => {
  try {
    const result = await createNote(req.body, req.user);
    return created(res, result, "Catatan berhasil disimpan");
  } catch (err) {
    next(err);
  }
};

const updateController = async (req, res, next) => {
  try {
    const result = await updateNote(req.params.id, req.body, req.user);
    return success(res, result, "Catatan berhasil diperbarui");
  } catch (err) {
    next(err);
  }
};

const getStatsController = async (req, res, next) => {
  try {
    const result = await getStatsData(req.query);
    return success(res, result, "Stats fetched");
  } catch (err) {
    next(err);
  }
};

const deleteController = async (req, res, next) => {
  try {
    await deleteNote(req.params.id, req.user);
    return success(res, null, "Catatan berhasil dihapus");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllController,
  getByIdController,
  getByInvoiceController,
  createController,
  updateController,
  deleteController,
  getStatsController,
};
