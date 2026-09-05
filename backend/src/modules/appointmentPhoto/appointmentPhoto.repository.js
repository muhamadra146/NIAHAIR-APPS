'use strict';

const prisma = require("../../config/prisma");

const findAllByAppointment = (appointmentId, { skip = 0, take = 10 } = {}) =>
  prisma.appointmentPhoto.findMany({
    where:   { appointmentId },
    orderBy: { createdAt: "asc" },
    skip,
    take,
  });

const countByAppointment = (appointmentId) =>
  prisma.appointmentPhoto.count({ where: { appointmentId } });

const findById = (id) =>
  prisma.appointmentPhoto.findUnique({ where: { id } });

const findAppointmentById = (appointmentId) =>
  prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true } });

const create = (data) =>
  prisma.appointmentPhoto.create({ data });

const remove = (id) =>
  prisma.appointmentPhoto.delete({ where: { id } });

module.exports = { findAllByAppointment, countByAppointment, findById, findAppointmentById, create, remove };
