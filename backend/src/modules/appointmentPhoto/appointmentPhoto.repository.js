'use strict';

const prisma = require("../../config/prisma");

const findAllByAppointment = (appointmentId) =>
  prisma.appointmentPhoto.findMany({
    where:   { appointmentId },
    orderBy: { createdAt: "asc" },
  });

const findById = (id) =>
  prisma.appointmentPhoto.findUnique({ where: { id } });

const findAppointmentById = (appointmentId) =>
  prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true } });

const create = (data) =>
  prisma.appointmentPhoto.create({ data });

const remove = (id) =>
  prisma.appointmentPhoto.delete({ where: { id } });

module.exports = { findAllByAppointment, findById, findAppointmentById, create, remove };
