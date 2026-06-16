const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const prisma  = require("../../config/prisma");
const repo    = require("./sickLeave.repository");

const MAX_NO_LETTER_PER_YEAR = 2;

const toDateOnly = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const calcTotalDays = (start, end) =>
  Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

// Generate array of UTC dates from start to end (inclusive)
const dateRange = (start, end) => {
  const dates = [];
  const curr  = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

// ── Service functions ─────────────────────────────────────────────────────────

const getAll = async ({ page = 1, limit = 20, employeeId, branchId, status }) => {
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (branchId)   where.branchId   = branchId;
  if (status)     where.status     = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getMy = async ({ employeeId, page = 1, limit = 20, status }) => {
  if (!employeeId) throw new AppError("Employee tidak ditemukan", StatusCodes.BAD_REQUEST);
  const { skip, take } = paginate(page, limit);
  const where = { employeeId };
  if (status) where.status = status;
  const [rows, total] = await Promise.all([repo.findAll({ skip, take, where }), repo.count(where)]);
  return { data: rows, meta: paginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const s = await repo.findById(id);
  if (!s) throw new AppError("Data sakit tidak ditemukan", StatusCodes.NOT_FOUND);
  return s;
};

const create = async (employeeId, branchId, body) => {
  if (!employeeId) throw new AppError("Employee tidak ditemukan", StatusCodes.BAD_REQUEST);

  const { startDate, endDate, hasLetter = false, letterDate, doctorName, diagnosis, clinicName } = body;

  const start = toDateOnly(startDate);
  const end   = toDateOnly(endDate);
  if (end < start) throw new AppError("Tanggal selesai harus setelah tanggal mulai", StatusCodes.BAD_REQUEST);

  const totalDays = calcTotalDays(start, end);

  // Resolve branchId
  let resolvedBranchId = branchId;
  if (!resolvedBranchId) {
    const emp = await prisma.employee.findUnique({
      where:  { id: employeeId },
      select: { homeBranchId: true },
    });
    resolvedBranchId = emp?.homeBranchId;
    if (!resolvedBranchId) throw new AppError("Branch tidak ditemukan", StatusCodes.BAD_REQUEST);
  }

  // Enforce max 2x no-letter per year
  if (!hasLetter) {
    const year  = start.getUTCFullYear();
    const count = await repo.countNoLetterInYear(employeeId, year);
    if (count >= MAX_NO_LETTER_PER_YEAR) {
      throw new AppError(
        `Batas ${MAX_NO_LETTER_PER_YEAR}x sakit tanpa surat dokter per tahun sudah tercapai. Harap lampirkan surat dokter.`,
        StatusCodes.BAD_REQUEST
      );
    }
  }

  const data = {
    employeeId,
    branchId: resolvedBranchId,
    startDate: start,
    endDate:   end,
    totalDays,
    hasLetter,
    letterDate: hasLetter && letterDate ? toDateOnly(letterDate) : null,
    doctorName: hasLetter && doctorName ? doctorName.trim() : null,
    diagnosis:  diagnosis ? diagnosis.trim() : null,
    clinicName: hasLetter && clinicName ? clinicName.trim() : null,
    status: "PENDING",
  };

  return repo.create(data);
};

const approve = async (id, reviewedBy, reviewNote) => {
  const sick = await repo.findById(id);
  if (!sick) throw new AppError("Data sakit tidak ditemukan", StatusCodes.NOT_FOUND);
  if (sick.status !== "PENDING") throw new AppError("Hanya sakit PENDING yang bisa disetujui", StatusCodes.BAD_REQUEST);

  // Upsert StaffSchedule for each day in the range
  const dates = dateRange(sick.startDate, sick.endDate);
  for (const workDate of dates) {
    await prisma.staffSchedule.upsert({
      where:  { employeeId_branchId_workDate: { employeeId: sick.employeeId, branchId: sick.branchId, workDate } },
      update: { status: "SAKIT", notes: sick.diagnosis ? `Sakit: ${sick.diagnosis}` : "Sakit" },
      create: { employeeId: sick.employeeId, branchId: sick.branchId, workDate, status: "SAKIT", notes: sick.diagnosis ? `Sakit: ${sick.diagnosis}` : "Sakit" },
    });
  }

  return repo.update(id, {
    status:     "APPROVED",
    reviewedBy,
    reviewedAt: new Date(),
    reviewNote: reviewNote ?? null,
  });
};

const reject = async (id, reviewedBy, reviewNote) => {
  const sick = await repo.findById(id);
  if (!sick) throw new AppError("Data sakit tidak ditemukan", StatusCodes.NOT_FOUND);
  if (sick.status !== "PENDING") throw new AppError("Hanya sakit PENDING yang bisa ditolak", StatusCodes.BAD_REQUEST);

  return repo.update(id, {
    status:     "REJECTED",
    reviewedBy,
    reviewedAt: new Date(),
    reviewNote: reviewNote ?? null,
  });
};

const cancel = async (id, employeeId) => {
  const sick = await repo.findById(id);
  if (!sick) throw new AppError("Data sakit tidak ditemukan", StatusCodes.NOT_FOUND);
  if (sick.employeeId !== employeeId) throw new AppError("Akses ditolak", StatusCodes.FORBIDDEN);
  if (sick.status !== "PENDING") throw new AppError("Hanya sakit PENDING yang bisa dibatalkan", StatusCodes.BAD_REQUEST);
  return repo.update(id, { status: "REJECTED" });
};

const uploadDocument = async (id, employeeId, file) => {
  if (!file) throw new AppError("File tidak ditemukan", StatusCodes.BAD_REQUEST);
  const sick = await repo.findById(id);
  if (!sick) throw new AppError("Data sakit tidak ditemukan", StatusCodes.NOT_FOUND);
  if (sick.employeeId !== employeeId) throw new AppError("Akses ditolak", StatusCodes.FORBIDDEN);

  return repo.update(id, {
    letterPhotoUrl:      file.path,
    letterPhotoPublicId: file.filename,
  });
};

module.exports = { getAll, getMy, getById, create, approve, reject, cancel, uploadDocument };
