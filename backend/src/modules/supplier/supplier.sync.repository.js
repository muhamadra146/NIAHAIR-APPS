'use strict';

const prisma = require("../../config/prisma");

const findByAccurateId = (accurateVendorId) =>
  prisma.supplier.findUnique({ where: { accurateVendorId } });

const createFromAccurate = (data) =>
  prisma.supplier.create({ data: { ...data, lastSyncAt: new Date() } });

const updateByAccurateId = (accurateVendorId, data) =>
  prisma.supplier.update({ where: { accurateVendorId }, data: { ...data, lastSyncAt: new Date() } });

const findAllActive = ({ skip = 0, take = 10 } = {}) =>
  prisma.supplier.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true, code: true, paymentTerms: true, accurateVendorId: true },
    orderBy: { name: "asc" },
    skip,
    take,
  });

const countActive = () => prisma.supplier.count({ where: { isActive: true } });

module.exports = { findByAccurateId, createFromAccurate, updateByAccurateId, findAllActive, countActive };
