// ── Notifikasi (lonceng di aplikasi + email) ──────────────────────────
//
// Keputusan user 2026-10-14:
//   · Cuti / izin / sakit / koreksi baru → manager divisi karyawan itu (di cabangnya);
//     pengajuan manager, karyawan tanpa divisi, atau divisi tanpa manager → Owner & Super Admin
//   · Pengajuan disetujui / ditolak       → karyawan yang mengajukan
//   · Komisi menunggu persetujuan          → Finance
//   · Payroll menunggu persetujuan         → Owner, Super Admin & Finance
//   · Kasbon baru                           → Owner, Super Admin & Finance
//
// Notifikasi bersifat "terbaik-usaha": kegagalan membuat notifikasi / mengirim email
// TIDAK membatalkan proses utama (dicatat di log saja).

const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const logger = require("../../utils/logger");
const { sendMail } = require("../../common/utils/mailer");
const { ROLES } = require("../../common/constants/role.constant");
const divisionRepo = require("../division/division.repository");
const divisionAccess = require("../division/division.access");
const repo = require("./notification.repository");

const OWNER_ROLES   = [ROLES.SUPER_ADMIN, ROLES.OWNER];
const FINANCE_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.FINANCE];

const REQUEST_LABEL = {
  LEAVE:      { name: "cuti",              link: "/pengajuan?tab=cuti-izin&jenis=cuti" },
  PERMISSION: { name: "izin",              link: "/pengajuan?tab=cuti-izin&jenis=izin" },
  SICK:       { name: "sakit",             link: "/pengajuan?tab=cuti-izin&jenis=sakit" },
  CORRECTION: { name: "koreksi jam kerja", link: "/pengajuan?tab=koreksi" },
};

// ── Kirim ──────────────────────────────────────────────────────────────

const appUrl = () => (process.env.APP_URL ?? "").replace(/\/$/, "");

const emailHtml = ({ title, message, link }) => `
<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5">
  <table width="520" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e4e7;border-radius:12px">
    <tr><td style="background:#be185d;padding:18px 28px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-size:18px;font-weight:700">NIAHAIR ERP</span></td></tr>
    <tr><td style="padding:24px 28px">
      <h2 style="margin:0 0 8px;font-size:17px;color:#111">${title}</h2>
      <p style="margin:0 0 20px;color:#444;font-size:14px;line-height:1.6">${message}</p>
      ${link ? `<a href="${appUrl()}${link}" style="display:inline-block;background:#be185d;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px">Buka di NIAHAIR ERP</a>` : ""}
    </td></tr>
  </table>
</body></html>`;

/**
 * Buat notifikasi untuk daftar user + kirim email (tidak menunggu email selesai).
 * @param {{ id: string, email?: string }[]} users
 */
const notifyUsers = async (users, { type, title, message, link = null, excludeUserId = null }) => {
  try {
    const unique = [...new Map(users.filter((u) => u?.id && u.id !== excludeUserId).map((u) => [u.id, u])).values()];
    if (unique.length === 0) return 0;
    await repo.createMany(unique.map((u) => ({ userId: u.id, type, title, message, link })));

    if (process.env.SMTP_HOST) {
      for (const u of unique) {
        if (!u.email) continue;
        sendMail({ to: u.email, subject: `[NIAHAIR] ${title}`, html: emailHtml({ title, message, link }) })
          .catch((err) => logger.warn(`[notification] email gagal ke ${u.email}: ${err.message}`));
      }
    }
    return unique.length;
  } catch (err) {
    logger.error(`[notification] gagal membuat notifikasi ${type}: ${err.message}`);
    return 0;
  }
};

// ── Penerima ───────────────────────────────────────────────────────────

/** Penyetuju pengajuan karyawan: manager divisinya di cabangnya, atau Owner & Super Admin */
const findApproverUsers = async (employeeId) => {
  const emp = await divisionRepo.findEmployeeScope(employeeId);
  if (emp?.divisionId && emp.homeBranchId && !emp.isDivisionManager) {
    const managers = await divisionRepo.findDivisionManagers({
      divisionId: emp.divisionId, branchId: emp.homeBranchId, excludeEmployeeId: emp.id,
    });
    const users = managers.map((m) => m.user).filter(Boolean);
    if (users.length > 0) return users;
  }
  return repo.findUsersByRoles(OWNER_ROLES);
};

// ── Peristiwa ──────────────────────────────────────────────────────────

/** Pengajuan baru (kind: LEAVE | PERMISSION | SICK | CORRECTION) */
const requestCreated = async (kind, { employeeId, detail = "" }) => {
  try {
    const label = REQUEST_LABEL[kind];
    const emp   = await repo.findEmployeeName(employeeId);
    const users = await findApproverUsers(employeeId);
    return notifyUsers(users, {
      type:    `${kind}_REQUEST`,
      title:   `Pengajuan ${label.name} baru — ${emp?.name ?? "karyawan"}`,
      message: `${emp?.name ?? "Karyawan"} mengajukan ${label.name}${detail ? ` (${detail})` : ""}. Menunggu persetujuan Anda.`,
      link:    label.link,
    });
  } catch (err) {
    logger.error(`[notification] requestCreated ${kind}: ${err.message}`);
    return 0;
  }
};

/** Pengajuan disetujui / ditolak → karyawan yang mengajukan (detail = tanggal pengajuan) */
const requestDecided = async (kind, { employeeId, approved, note = "", detail = "" }) => {
  try {
    const label = REQUEST_LABEL[kind];
    const users = await repo.findUsersByEmployeeIds([employeeId]);
    const status = approved ? "disetujui" : "ditolak";
    return notifyUsers(users, {
      type:    "REQUEST_DECIDED",
      title:   `Pengajuan ${label.name} Anda ${status}`,
      message: `Pengajuan ${label.name} Anda${detail ? ` (${detail})` : ""} telah ${status}.${note ? ` Catatan: ${note}` : ""}`,
      link:    label.link.replace("/pengajuan?", "/pengajuan?lihat=saya&"),
    });
  } catch (err) {
    logger.error(`[notification] requestDecided ${kind}: ${err.message}`);
    return 0;
  }
};

/**
 * Pengajuan dibatalkan karyawan → notifikasi "Menunggu persetujuan Anda" milik penyetuju
 * diperbarui menjadi "dibatalkan" (tidak perlu tindakan) dan ditandai sudah dibaca.
 * detail = awal keterangan saat pengajuan dibuat (tanggal), dipakai mencocokkan notifikasinya.
 */
const requestCancelled = async (kind, { employeeId, detail = "", since = null }) => {
  try {
    const label = REQUEST_LABEL[kind];
    const name  = (await repo.findEmployeeName(employeeId))?.name ?? "Karyawan";
    // Notifikasi dibuat sesaat setelah pengajuan tersimpan
    const from  = since ? new Date(new Date(since).getTime() - 60 * 1000) : null;
    const result = await repo.updateRequestNotifications({
      type:            `${kind}_REQUEST`,
      messageContains: `${name} mengajukan ${label.name}${detail ? ` (${detail}` : ""}`,
      since:           from,
      data: {
        title:   `Pengajuan ${label.name} dibatalkan — ${name}`,
        message: `${name} membatalkan pengajuan ${label.name}${detail ? ` (${detail})` : ""}. Tidak perlu tindakan.`,
        isRead:  true,
        readAt:  new Date(),
      },
    });
    return result?.count ?? 0;
  } catch (err) {
    logger.error(`[notification] requestCancelled ${kind}: ${err.message}`);
    return 0;
  }
};

/** Pengajuan yang sudah disetujui dibatalkan atasan → karyawan yang mengajukan */
const requestRevoked = async (kind, { employeeId, detail = "", note = "" }) => {
  try {
    const label = REQUEST_LABEL[kind];
    const users = await repo.findUsersByEmployeeIds([employeeId]);
    return notifyUsers(users, {
      type:    "REQUEST_DECIDED",
      title:   `${label.name[0].toUpperCase()}${label.name.slice(1)} Anda dibatalkan`,
      message: `${label.name[0].toUpperCase()}${label.name.slice(1)} Anda${detail ? ` (${detail})` : ""} yang sudah disetujui telah dibatalkan oleh atasan.${note ? ` ${note}` : ""}`,
      link:    label.link.replace("/pengajuan?", "/pengajuan?lihat=saya&"),
    });
  } catch (err) {
    logger.error(`[notification] requestRevoked ${kind}: ${err.message}`);
    return 0;
  }
};

/** Pekerjaan invoice sudah diisi staf → Finance (siap dihitung komisinya) */
const jobsReadyForCalculation = async ({ invoiceId }) => {
  try {
    const invoiceNo = (await repo.findInvoiceNo(invoiceId))?.invoiceNo ?? "invoice";
    const users = await repo.findUsersByRoles([ROLES.FINANCE]);
    return notifyUsers(users, {
      type:    "COMMISSION_READY",
      title:   `Pekerjaan ${invoiceNo} siap dihitung komisinya`,
      message: `Staf sudah mengisi pengerjaan invoice ${invoiceNo}. Silakan hitung dan simpan komisinya.`,
      link:    "/generate-komisi",
    });
  } catch (err) {
    logger.error(`[notification] jobsReadyForCalculation: ${err.message}`);
    return 0;
  }
};

/** Komisi baru menunggu persetujuan → Finance */
const commissionPending = async ({ invoiceId, count, actorUserId = null }) => {
  try {
    const invoiceNo = (await repo.findInvoiceNo(invoiceId))?.invoiceNo ?? "invoice";
    const users = await repo.findUsersByRoles([ROLES.FINANCE]);
    return notifyUsers(users, {
      type:    "COMMISSION_PENDING",
      title:   `${count} komisi menunggu persetujuan`,
      message: `Komisi dari invoice ${invoiceNo} sudah dihitung dan menunggu persetujuan Finance.`,
      link:    "/commissions",
      excludeUserId: actorUserId,
    });
  } catch (err) {
    logger.error(`[notification] commissionPending: ${err.message}`);
    return 0;
  }
};

/** Payroll diajukan untuk persetujuan → Owner, Super Admin & Finance */
const payrollPending = async ({ employeeName, periodLabel, submittedByUserId }) => {
  try {
    return await notifyUsers(await repo.findUsersByRoles(FINANCE_ROLES), {
      type:          "PAYROLL_PENDING",
      title:         `Payroll menunggu persetujuan — ${employeeName}`,
      message:       `Payroll ${periodLabel} untuk ${employeeName} diajukan dan menunggu persetujuan.`,
      link:          "/payroll",
      excludeUserId: submittedByUserId,
    });
  } catch (err) {
    logger.error(`[notification] payrollPending: ${err.message}`);
    return 0;
  }
};

/** Kasbon baru → Owner, Super Admin & Finance */
const loanCreated = async ({ employeeId, totalAmount, createdByUserId }) => {
  try {
    const employeeName = (await repo.findEmployeeName(employeeId))?.name ?? "karyawan";
    const amountLabel  = `Rp ${Math.round(Number(totalAmount)).toLocaleString("id-ID")}`;
    return await notifyUsers(await repo.findUsersByRoles(FINANCE_ROLES), {
      type:          "LOAN_CREATED",
      title:         `Kasbon baru — ${employeeName}`,
      message:       `Kasbon ${amountLabel} untuk ${employeeName} telah dibuat.`,
      link:          "/loans",
      excludeUserId: createdByUserId,
    });
  } catch (err) {
    logger.error(`[notification] loanCreated: ${err.message}`);
    return 0;
  }
};

// ── API pengguna ───────────────────────────────────────────────────────

const listMine = (userId, { limit, unreadOnly } = {}) =>
  repo.findForUser(userId, { take: Math.min(Number(limit) || 20, 50), unreadOnly: unreadOnly === "true" || unreadOnly === true });

/** Ringkasan untuk lonceng & angka di menu Pengajuan */
const summary = async (user) => {
  const scope = await divisionAccess.getScope(user);
  const [unread, pending] = await Promise.all([
    repo.countUnread(user.id),
    divisionAccess.isApprover(scope)
      ? repo.countPendingRequests(divisionAccess.managedEmployeeWhere(scope))
      : Promise.resolve(null),
  ]);
  const pendingTotal = pending ? pending.cuti + pending.izin + pending.sakit + pending.koreksi : 0;
  return { unread, pendingApprovals: pending, pendingApprovalTotal: pendingTotal };
};

// Notifikasi orang lain / id asal → 404 (sudah dibaca sebelumnya tetap sukses)
const markRead = async (userId, id) => {
  const result = await repo.markRead(userId, id);
  if ((result?.count ?? 0) === 0 && !(await repo.findOwned(userId, id))) {
    throw new AppError("Notifikasi tidak ditemukan", StatusCodes.NOT_FOUND);
  }
  return result;
};
const markAllRead = (userId)     => repo.markAllRead(userId);

module.exports = {
  notifyUsers, findApproverUsers,
  requestCreated, requestDecided, requestCancelled, requestRevoked, jobsReadyForCalculation, commissionPending, payrollPending, loanCreated,
  listMine, summary, markRead, markAllRead,
};
