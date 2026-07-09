const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { resolveOrderBy } = require("../../utils/sort");
const cloudinary = require("../../config/cloudinary");

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
  findRoleById,
  create,
  update,
  updateFiles,
  updateBranches,
  softDelete,
  hardDelete,
} = require("./employee.repository");

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

const getAll = async ({ page, limit, search, isActive, branchId, sortBy }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const orderBy = resolveOrderBy(sortBy, ORDER_MAP);

  const where = {};
  const andClauses = [];

  if (search) {
    andClauses.push({
      OR: [
        { name:         { contains: search, mode: "insensitive" } },
        { email:        { contains: search, mode: "insensitive" } },
        { phone:        { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
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
    data: employees,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  return employee;
};

const getNextCode = async () => generateNextCode();

const createEmployee = async (body) => {
  const role = await findRoleById(body.roleId);
  if (!role) throw new AppError("Employee role not found", StatusCodes.NOT_FOUND);

  if (!body.employeeCode) {
    body.employeeCode = await generateNextCode();
  } else {
    const existing = await findByEmployeeCode(body.employeeCode);
    if (existing) throw new AppError("Employee code already exists", StatusCodes.CONFLICT);
  }

  if (body.email) {
    const existing = await findByEmail(body.email);
    if (existing) throw new AppError("Email already exists", StatusCodes.CONFLICT);
  }

  if (body.hireDate)   body.hireDate   = new Date(body.hireDate);
  if (body.birthDate)  body.birthDate  = new Date(body.birthDate);
  if (body.resignDate) body.resignDate = new Date(body.resignDate);

  try {
    return await create(body);
  } catch (err) {
    if (err?.code === "P2002" && err?.meta?.target?.includes("employeeCode")) {
      body.employeeCode = await generateNextCode();
      return create(body);
    }
    throw err;
  }
};

const updateEmployee = async (id, body) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);

  if (body.roleId && body.roleId !== employee.roleId) {
    const role = await findRoleById(body.roleId);
    if (!role) throw new AppError("Employee role not found", StatusCodes.NOT_FOUND);
  }

  if (body.employeeCode && body.employeeCode !== employee.employeeCode) {
    const existing = await findByEmployeeCode(body.employeeCode);
    if (existing) throw new AppError("Employee code already exists", StatusCodes.CONFLICT);
  }

  if (body.email && body.email !== employee.email) {
    const existing = await findByEmail(body.email);
    if (existing) throw new AppError("Email already exists", StatusCodes.CONFLICT);
  }

  if (body.hireDate)   body.hireDate   = new Date(body.hireDate);
  if (body.birthDate)  body.birthDate  = new Date(body.birthDate);
  if (body.resignDate) body.resignDate = new Date(body.resignDate);

  return update(id, body);
};

const updateEmployeeBranches = async (id, branchIds) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  return updateBranches(id, branchIds);
};

const uploadEmployeeFiles = async (id, { ktpFileUrl, ktpFilePublicId, contractFileUrl, contractFilePublicId }) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
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
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  if (!employee.isActive) throw new AppError("Karyawan sudah nonaktif", StatusCodes.UNPROCESSABLE_ENTITY);
  return softDelete(id);
};

const deleteEmployee = async (id) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  await Promise.all([
    deleteCloudinaryFile(employee.ktpFilePublicId, employee.ktpFileUrl),
    deleteCloudinaryFile(employee.contractFilePublicId, employee.contractFileUrl),
  ]);
  return hardDelete(id);
};

module.exports = { getAll, getById, getNextCode, createEmployee, updateEmployee, uploadEmployeeFiles, updateEmployeeBranches, deactivateEmployee, deleteEmployee };
