'use strict';

const prisma = require("../../config/prisma");

const findByAccurateId = (accurateVendorId) =>
  prisma.supplier.findUnique({ where: { accurateVendorId } });

const createFromAccurate = (data) =>
  prisma.supplier.create({ data: { ...data, lastSyncAt: new Date() } });

const updateByAccurateId = (accurateVendorId, data) =>
  prisma.supplier.update({ where: { accurateVendorId }, data: { ...data, lastSyncAt: new Date() } });

// B1 fix: field select lengkap (email, phone, address, isActive, lastSyncAt)
// B2 fix: tidak filter isActive agar SupplierPage bisa lihat semua (aktif & non-aktif)
const findAll = ({ skip = 0, take = 200, where = {} } = {}) =>
  prisma.supplier.findMany({
    where,
    select: {
      id:               true,
      name:             true,
      code:             true,
      email:            true,
      phone:            true,
      businessPhone:    true,
      whatsapp:         true,
      website:          true,
      address:          true,
      paymentTerms:     true,
      purchaseDiscount: true,
      accurateVendorId: true,
      isActive:         true,
      lastSyncAt:       true,
    },
    orderBy: { name: "asc" },
    skip,
    take,
  });

const count = (where = {}) => prisma.supplier.count({ where });

module.exports = { findByAccurateId, createFromAccurate, updateByAccurateId, findAll, count };
