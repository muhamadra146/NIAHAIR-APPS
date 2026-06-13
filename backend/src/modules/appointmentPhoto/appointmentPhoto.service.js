const { StatusCodes } = require("http-status-codes");
const AppError        = require("../../common/errors/AppError");
const prisma          = require("../../config/prisma");
const cloudinary      = require("../../config/cloudinary");

const listPhotos = (appointmentId) =>
  prisma.appointmentPhoto.findMany({
    where:   { appointmentId },
    orderBy: { createdAt: "asc" },
  });

const addPhoto = async ({ appointmentId, url, publicId, type = "REFERENCE", notes }) => {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true } });
  if (!appt) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);

  return prisma.appointmentPhoto.create({
    data: { appointmentId, url, publicId, type, notes: notes ?? null },
  });
};

const deletePhoto = async (id) => {
  const photo = await prisma.appointmentPhoto.findUnique({ where: { id } });
  if (!photo) throw new AppError("Photo not found", StatusCodes.NOT_FOUND);

  await cloudinary.uploader.destroy(photo.publicId);
  await prisma.appointmentPhoto.delete({ where: { id } });
};

module.exports = { listPhotos, addPhoto, deletePhoto };
