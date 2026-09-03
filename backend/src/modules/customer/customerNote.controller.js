const { success, created } = require("../../common/responses/apiResponse");
const { getNotes, createNote, updateNote, deleteNote } = require("./customerNote.service");

const getNotesController = async (req, res, next) => {
  try {
    const skip = parseInt(req.query.skip ?? "0", 10);
    const take = parseInt(req.query.take ?? "50", 10);
    const notes = await getNotes(req.params.id, { skip, take });
    return success(res, notes, "Notes fetched");
  } catch (err) {
    next(err);
  }
};

const createNoteController = async (req, res, next) => {
  try {
    const creatorName = req.user?.name ?? req.user?.email ?? null;
    const note = await createNote(req.params.id, req.body, creatorName);
    return created(res, note, "Note created");
  } catch (err) {
    next(err);
  }
};

const updateNoteController = async (req, res, next) => {
  try {
    const note = await updateNote(
      req.params.id,
      req.params.noteId,
      req.body,
      req.user?.roleCode,
    );
    return success(res, note, "Note updated");
  } catch (err) {
    next(err);
  }
};

const deleteNoteController = async (req, res, next) => {
  try {
    await deleteNote(req.params.id, req.params.noteId, req.user?.roleCode);
    return success(res, null, "Note deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotesController, createNoteController, updateNoteController, deleteNoteController };
