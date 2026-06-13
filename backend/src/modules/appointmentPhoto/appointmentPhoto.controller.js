const { success, created } = require("../../common/responses/apiResponse");
const { listPhotos, addPhoto, deletePhoto } = require("./appointmentPhoto.service");

const listController = async (req, res, next) => {
  try {
    const data = await listPhotos(req.params.appointmentId);
    return success(res, data, "Photos fetched");
  } catch (err) { next(err); }
};

const uploadController = async (req, res, next) => {
  try {
    if (!req.file) throw new Error("No file uploaded");

    const { type = "REFERENCE", notes } = req.body;
    const photo = await addPhoto({
      appointmentId: req.params.appointmentId,
      url:           req.file.path,
      publicId:      req.file.filename,
      type,
      notes,
    });
    return created(res, photo, "Photo uploaded");
  } catch (err) { next(err); }
};

const deleteController = async (req, res, next) => {
  try {
    await deletePhoto(req.params.photoId);
    return success(res, null, "Photo deleted");
  } catch (err) { next(err); }
};

module.exports = { listController, uploadController, deleteController };
