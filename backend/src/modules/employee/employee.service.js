const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
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
  updateBranches,
  softDelete,
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

const getAll = async ({ page, limit, search, isActive, branchId }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

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
    findAll({ skip, take, where }),
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

  if (body.hireDate) body.hireDate = new Date(body.hireDate);
  if (body.birthDate) body.birthDate = new Date(body.birthDate);

  return create(body);
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

  if (body.hireDate) body.hireDate = new Date(body.hireDate);
  if (body.birthDate) body.birthDate = new Date(body.birthDate);

  return update(id, body);
};

const updateEmployeeBranches = async (id, branchIds) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  return updateBranches(id, branchIds);
};

const deleteEmployee = async (id) => {
  const employee = await findById(id);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  return softDelete(id);
};

module.exports = { getAll, getById, getNextCode, createEmployee, updateEmployee, updateEmployeeBranches, deleteEmployee };
