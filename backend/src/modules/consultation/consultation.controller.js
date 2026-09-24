const { success, created } = require("../../common/responses/apiResponse");
const AppError = require("../../common/errors/AppError");
const {
  listNotes,
  getUnfilledInvoiceList,
  getNoteById,
  getNoteByInvoiceId,
  createNote,
  updateNote,
  uploadNotePhoto,
  deleteNote,
  getStatsData,
} = require("./consultation.service");

const getAllController = async (req, res, next) => {
  try {
    const result = await listNotes(req.query, req.user);
    return success(res, result, "Catatan fetched");
  } catch (err) {
    next(err);
  }
};

const getUnfilledInvoicesController = async (req, res, next) => {
  try {
    const result = await getUnfilledInvoiceList(req.query, req.user);
    return success(res, result, "Invoice belum diisi fetched");
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

const uploadPhotoController = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("File foto tidak ditemukan", 400);
    const { type = "BEFORE" } = req.body;
    const result = await uploadNotePhoto(
      req.params.id,
      { url: req.file.path, publicId: req.file.filename, type },
      req.user
    );
    return success(res, result, "Foto berhasil diupload");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllController,
  getUnfilledInvoicesController,
  getByIdController,
  getByInvoiceController,
  createController,
  updateController,
  uploadPhotoController,
  deleteController,
  getStatsController,
};
