const prisma = require("../../config/prisma");

const createMany = (rows) => prisma.notification.createMany({ data: rows });

const findForUser = (userId, { take = 20, unreadOnly = false } = {}) =>
  prisma.notification.findMany({
    where:   { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take,
  });

const countUnread = (userId) => prisma.notification.count({ where: { userId, isRead: false } });

const markRead = (userId, id) =>
  prisma.notification.updateMany({ where: { id, userId, isRead: false }, data: { isRead: true, readAt: new Date() } });

const markAllRead = (userId) =>
  prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true, readAt: new Date() } });

// ── Penerima ───────────────────────────────────────────────────────────

const ACTIVE_USER = { isActive: true };

/** User aktif dengan role tertentu (mis. OWNER, SUPER_ADMIN, FINANCE) */
const findUsersByRoles = (roleCodes) =>
  prisma.user.findMany({
    where:  { ...ACTIVE_USER, role: { code: { in: roleCodes } } },
    select: { id: true, email: true, employee: { select: { name: true } } },
  });

/** User aktif milik karyawan-karyawan tertentu */
const findUsersByEmployeeIds = (employeeIds) =>
  prisma.user.findMany({
    where:  { ...ACTIVE_USER, employeeId: { in: employeeIds } },
    select: { id: true, email: true, employee: { select: { name: true } } },
  });

const findInvoiceNo = (invoiceId) =>
  prisma.invoice.findUnique({ where: { id: invoiceId }, select: { invoiceNo: true } });

const findEmployeeName = (employeeId) =>
  prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } });

// Jumlah pengajuan yang menunggu persetujuan (dibatasi wewenang divisi)
const countPendingRequests = async (employeeWhere) => {
  const where = { status: "PENDING", employee: employeeWhere };
  const [cuti, izin, sakit, koreksi] = await Promise.all([
    prisma.leave.count({ where }),
    prisma.permissionRequest.count({ where }),
    prisma.sickLeave.count({ where }),
    prisma.attendanceCorrectionRequest.count({ where }),
  ]);
  return { cuti, izin, sakit, koreksi };
};

module.exports = {
  createMany, findForUser, countUnread, markRead, markAllRead,
  findUsersByRoles, findUsersByEmployeeIds, findEmployeeName, findInvoiceNo, countPendingRequests,
};
