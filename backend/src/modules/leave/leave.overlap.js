// ── Cegah pengajuan ketidakhadiran yang tumpang tindih ─────────────────
//
// Cuti, izin, dan sakit milik karyawan yang sama tidak boleh beririsan tanggal
// dengan pengajuan lain yang masih MENUNGGU atau sudah DISETUJUI.
// (pengajuan yang ditolak / dibatalkan tidak dihitung)

const { StatusCodes } = require("http-status-codes");
const AppError       = require("../../common/errors/AppError");
const leaveRepo      = require("./leave.repository");
const permissionRepo = require("../permission/permission.repository");
const sickLeaveRepo  = require("../sickLeave/sickLeave.repository");

const _tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const _range = (a, b) => (new Date(a).getTime() === new Date(b).getTime() ? _tgl(a) : `${_tgl(a)} – ${_tgl(b)}`);
const _status = (s) => (s === "APPROVED" ? "sudah disetujui" : "masih menunggu persetujuan");

/**
 * @param {string} employeeId
 * @param {Date} start  tanggal mulai (00:00 UTC)
 * @param {Date} end    tanggal selesai (00:00 UTC)
 */
const assertNoOverlappingRequest = async (employeeId, start, end) => {
  const [leave, permission, sick] = await Promise.all([
    leaveRepo.findOverlapping(employeeId, start, end),
    permissionRepo.findOverlapping(employeeId, start, end),
    sickLeaveRepo.findOverlapping(employeeId, start, end),
  ]);

  let detail = null;
  if (leave)      detail = `cuti ${_range(leave.startDate, leave.endDate)} (${_status(leave.status)})`;
  else if (sick)  detail = `sakit ${_range(sick.startDate, sick.endDate)} (${_status(sick.status)})`;
  else if (permission) detail = `izin ${_tgl(permission.date)} (${_status(permission.status)})`;

  if (detail) {
    throw new AppError(
      `Tanggal bertabrakan dengan pengajuan ${detail}. Batalkan pengajuan tersebut atau pilih tanggal lain.`,
      StatusCodes.CONFLICT,
    );
  }
};

module.exports = { assertNoOverlappingRequest };
