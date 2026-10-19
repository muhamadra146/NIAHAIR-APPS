const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { ROLES } = require("../../common/constants/role.constant");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");
const cloudinary = require("../../config/cloudinary");
const divisionRepo   = require("../division/division.repository");
const divisionAccess = require("../division/division.access");
const { escapeLike } = require("../customer/customer.fields");

// Deteksi resource_type dari URL Cloudinary (/raw/upload/ = file, sisanya = image)
const deleteCloudinaryFile = async (publicId, url) => {
  if (!publicId) return;
  const resourceType = url?.includes("/raw/upload/") ? "raw" : "image";
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch {
    // Non-critical — DB operation tetap lanjut walaupun Cloudinary gagal
  }
};

const ORDER_MAP = {
  name:         { name: "asc" },
  "-name":      { name: "desc" },
  createdAt:    { createdAt: "asc" },
  "-createdAt": { createdAt: "desc" },
  employeeCode: { employeeCode: "asc" },
  "-employeeCode": { employeeCode: "desc" },
};
const {
  findAll,
  count,
  findById,
  findByEmployeeCode,
  findLastEmployeeCode,
  findByEmail,
  findUserByEmail,
  findRoleById,
  create,
  update,
  updateFiles,
  updateBranches,
  syncPrimaryBranch,
  softDelete,
  hardDelete,
  countHistory,
} = require("./employee.repository");

// ── Visibilitas data karyawan (EMP-029) ──────────────────────────────
// Peran pengelola melihat seluruh kolom; peran lain hanya data umum
// (tanpa NIK/KTP, alamat, tanggal lahir, file, tanggal gajian, kontak) — kecuali data dirinya sendiri.
const FULL_VIEW_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.MANAGER, ROLES.OFFICE, ROLES.FINANCE];
const PUBLIC_FIELDS = [
  "id", "employeeCode", "name", "isActive", "roleId", "role",
  "homeBranchId", "homeBranch", "divisionId", "division", "isDivisionManager",
  "employeeBranches", "commissionEnabled",
];
const canViewFull = (actor) => !actor || FULL_VIEW_ROLES.includes(actor.roleCode);
const toPublicEmployee = (employee) =>
  Object.fromEntries(PUBLIC_FIELDS.filter((f) => f in employee).map((f) => [f, employee[f]]));
const visibleFor = (actor) => (employee) =>
  (canViewFull(actor) || (actor?.employeeId && actor.employeeId === employee.id)) ? employee : toPublicEmployee(employee);

/** Email dibandingkan & disimpan tanpa beda huruf besar/kecil */
const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : email);

const generateNextCode = async () => {
  const last = await findLastEmployeeCode();
  let num = last ? (parseInt(last.employeeCode.replace(/^EMP0*/, ""), 10) || 0) : 0;
  let code;
  do {
    num += 1;
    code = "EMP" + String(num).padStart(3, "0");
  } while (await findByEmployeeCode(code));
  return code;
};

const getAll = async ({ page, limit, search, isActive, branchId, sortBy }, actor = null) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);

  const where = {};
  const andClauses = [];

  if (search) {
    // "%" / "_" dibaca harfiah, bukan wildcard LIKE
    const term = escapeLike(search);
    andClauses.push({
      OR: [
        { name:         { contains: term, mode: "insensitive" } },
        { email:        { contains: term, mode: "insensitive" } },
        { phone:        { contains: term, mode: "insensitive" } },
        { employeeCode: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true" || isActive === true;
  }

  if (branchId) {
    andClauses.push({
      OR: [
        { homeBranchId:      branchId },
        { employeeBranches: { some: { branchId, isActive: true } } },
      ],
    });
  }

  if (andClauses.length > 0) where.AND = andClauses;

  const [employees, total] = await Promise.all([
    findAll({ skip, take, where, orderBy }),
    count(where),
  ]);

  return {
    data: employees.map(visibleFor(actor)),
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id, actor = null) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  return visibleFor(actor)(employee);
};

const getNextCode = async () => generateNextCode();

// ── Divisi & manager divisi ──────────────────────────────────────────
// Hanya Owner / Super Admin yang boleh mengisi divisi & tanda manager divisi.
// Manager divisi wajib punya divisi dan cabang utama (wewenang = divisi + cabangnya).
const applyDivisionFields = async (body, existing, actor) => {
  const touches = body.divisionId !== undefined || body.isDivisionManager !== undefined;
  if (!touches) return;
  if (actor && !divisionAccess.hasFullAccess(actor)) {
    throw new AppError("Hanya Owner atau Super Admin yang dapat mengatur divisi karyawan", StatusCodes.FORBIDDEN);
  }
  if (body.divisionId === "") body.divisionId = null;
  if (body.divisionId) {
    const division = await divisionRepo.findById(body.divisionId);
    if (!division || !division.isActive) throw new AppError("Divisi tidak ditemukan atau nonaktif", StatusCodes.BAD_REQUEST);
  }
  const divisionId   = body.divisionId   !== undefined ? body.divisionId   : existing?.divisionId ?? null;
  const homeBranchId = body.homeBranchId !== undefined ? body.homeBranchId : existing?.homeBranchId ?? null;
  const isManager    = body.isDivisionManager !== undefined ? body.isDivisionManager : existing?.isDivisionManager ?? false;
  if (!divisionId) { body.isDivisionManager = false; return; }
  if (isManager && !homeBranchId) {
    throw new AppError("Manager divisi wajib punya cabang utama", StatusCodes.BAD_REQUEST);
  }
};

const createEmployee = async (body, actor) => {
  await applyDivisionFields(body, null, actor);
  const role = await findRoleById(body.roleId);
  if (!role) throw new AppError("Role karyawan tidak ditemukan", StatusCodes.NOT_FOUND);

  if (!body.employeeCode) {
    body.employeeCode = await generateNextCode();
  } else {
    // Kode disimpan huruf besar; dibandingkan tanpa beda huruf besar/kecil (B11)
    body.employeeCode = String(body.employeeCode).trim().toUpperCase();
    const existing = await findByEmployeeCode(body.employeeCode);
    if (existing) throw new AppError("Kode karyawan sudah digunakan", StatusCodes.CONFLICT);
  }

  if (body.email !== undefined) body.email = normalizeEmail(body.email);
  if (body.email) {
    const existing = await findByEmail(body.email);
    if (existing) throw new AppError("Email sudah digunakan", StatusCodes.CONFLICT);
    // Satu email per orang — tidak boleh sama dengan email login orang lain
    if (await findUserByEmail(body.email)) throw new AppError("Email sudah dipakai akun login lain", StatusCodes.CONFLICT);
  }

  if (body.hireDate)   body.hireDate   = new Date(body.hireDate);
  if (body.birthDate)  body.birthDate  = new Date(body.birthDate);
  if (body.resignDate) body.resignDate = new Date(body.resignDate);

  let employee;
  try {
    employee = await create(body);
  } catch (err) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("employeeCode")) {
      body.employeeCode = await generateNextCode();
      employee = await create(body);
    } else {
      throw err;
    }
  }

  // Home Branch = cabang Utama karyawan (EMP-005, B15)
  if (employee?.homeBranchId) {
    return (await syncPrimaryBranch(employee.id, employee.homeBranchId)) ?? employee;
  }
  return employee;
};

const updateEmployee = async (id, body, actor) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  if (body.homeBranchId === "") body.homeBranchId = null;
  await applyDivisionFields(body, employee, actor);

  // Status aktif hanya diubah Owner / Super Admin (penonaktifan lewat /deactivate)
  if (body.isActive !== undefined && actor && !divisionAccess.hasFullAccess(actor)) {
    if (body.isActive !== employee.isActive) {
      throw new AppError("Hanya Owner atau Super Admin yang dapat mengubah status aktif karyawan", StatusCodes.FORBIDDEN);
    }
    delete body.isActive;
  }

  if (body.roleId && body.roleId !== employee.roleId) {
    const role = await findRoleById(body.roleId);
    if (!role) throw new AppError("Role karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  }

  // EMP-001: kode karyawan tidak boleh berubah setelah dibuat
  if (body.employeeCode !== undefined) {
    if (String(body.employeeCode).trim().toUpperCase() !== String(employee.employeeCode).toUpperCase()) {
      throw new AppError("Kode karyawan tidak dapat diubah", StatusCodes.UNPROCESSABLE_ENTITY);
    }
    delete body.employeeCode;
  }

  // Satu email per orang: email karyawan = email login akunnya (keputusan user 2026-10-15)
  if (body.email !== undefined) body.email = normalizeEmail(body.email);
  const linkedUser = employee.user ?? null;
  const emailChanged = body.email !== undefined && (body.email || null) !== (normalizeEmail(employee.email) ?? null);
  if (emailChanged) {
    if (!body.email && linkedUser) {
      throw new AppError("Email wajib diisi karena karyawan punya akun login", StatusCodes.BAD_REQUEST);
    }
    if (body.email) {
      const existing = await findByEmail(body.email);
      if (existing && existing.id !== id) throw new AppError("Email sudah digunakan", StatusCodes.CONFLICT);
      const userOwner = await findUserByEmail(body.email);
      if (userOwner && userOwner.employeeId !== id) throw new AppError("Email sudah dipakai akun login lain", StatusCodes.CONFLICT);
    }
  }

  if (body.hireDate)   body.hireDate   = new Date(body.hireDate);
  if (body.birthDate)  body.birthDate  = new Date(body.birthDate);
  if (body.resignDate) body.resignDate = new Date(body.resignDate);

  // Email tidak berubah — jangan tulis ulang
  if (body.email !== undefined && !emailChanged) delete body.email;

  const updated = await update(id, body, emailChanged && linkedUser ? linkedUser.id : null);

  // Home Branch dikirim → cabang Utama ikut Home Branch (EMP-005, B15)
  if (body.homeBranchId !== undefined) {
    return (await syncPrimaryBranch(id, body.homeBranchId || null)) ?? updated;
  }
  return updated;
};

const updateEmployeeBranches = async (id, branchIds) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  const updated = await updateBranches(id, branchIds);
  // Home Branch selalu termasuk akses cabang walau tidak dikirim (EMP-005)
  if (employee.homeBranchId && !branchIds.includes(employee.homeBranchId)) {
    return (await syncPrimaryBranch(id, employee.homeBranchId)) ?? updated;
  }
  return updated;
};

const uploadEmployeeFiles = async (id, { ktpFileUrl, ktpFilePublicId, contractFileUrl, contractFilePublicId }) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  const data = {};
  if (ktpFileUrl) {
    await deleteCloudinaryFile(employee.ktpFilePublicId, employee.ktpFileUrl);
    data.ktpFileUrl = ktpFileUrl;
    data.ktpFilePublicId = ktpFilePublicId;
  }
  if (contractFileUrl) {
    await deleteCloudinaryFile(employee.contractFilePublicId, employee.contractFileUrl);
    data.contractFileUrl = contractFileUrl;
    data.contractFilePublicId = contractFilePublicId;
  }
  return updateFiles(id, data);
};

const deactivateEmployee = async (id) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  if (!employee.isActive) throw new AppError("Karyawan sudah nonaktif", StatusCodes.UNPROCESSABLE_ENTITY);
  return softDelete(id);
};

const deleteEmployee = async (id) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Karyawan tidak ditemukan", StatusCodes.NOT_FOUND);
  // EMP-015 / EMP-020: riwayat tidak boleh hilang — hapus permanen hanya untuk data tanpa riwayat
  if ((await countHistory(id)) > 0) {
    throw new AppError("Karyawan sudah punya riwayat; nonaktifkan saja", StatusCodes.CONFLICT);
  }
  await Promise.all([
    deleteCloudinaryFile(employee.ktpFilePublicId, employee.ktpFileUrl),
    deleteCloudinaryFile(employee.contractFilePublicId, employee.contractFileUrl),
  ]);
  return hardDelete(id);
};

module.exports = { getAll, getById, getNextCode, createEmployee, updateEmployee, uploadEmployeeFiles, updateEmployeeBranches, deactivateEmployee, deleteEmployee };
