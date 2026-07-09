const { success, created } = require("../../common/responses/apiResponse");
const { getNotes, createNote, deleteNote } = require("./customerNote.service");

const getNotesController = async (req, res, next) => {
  try {
    const notes = await getNotes(req.params.id);
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

const deleteNoteController = async (req, res, next) => {
  try {
    await deleteNote(req.params.id, req.params.noteId, req.user?.roleCode);
    return success(res, null, "Note deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotesController, createNoteController, deleteNoteController };
