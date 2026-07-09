const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const cloudinary      = require("../../config/cloudinary");
const {
  findAllByAppointment,
  findById,
  findAppointmentById,
  create,
  remove,
} = require("./appointmentPhoto.repository");

const listPhotos = (appointmentId) =>
  findAllByAppointment(appointmentId);

const addPhoto = async ({ appointmentId, url, publicId, type = "REFERENCE", notes }) => {
  const appt = await findAppointmentById(appointmentId);
  if (!appt) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  return create({ appointmentId, url, publicId, type, notes: notes ?? null });
};

const deletePhoto = async (id) => {
  const photo = await findById(id);
  if (!photo) throw new AppError("Photo not found", StatusCodes.NOT_FOUND);

  await cloudinary.uploader.destroy(photo.publicId);
  return remove(photo.id);
};

module.exports = { listPhotos, addPhoto, deletePhoto };
