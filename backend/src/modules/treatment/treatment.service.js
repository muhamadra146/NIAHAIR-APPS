const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const {
  findAll,
  count,
  findById,
  findCustomerById,
  findBranchById,
  findAppointmentById,
  create,
  update,
} = require("./treatment.repository");

const getAll = async ({ page, limit, customerId, branchId, startDate, endDate }) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);

  const where = {};

  if (customerId) where.customerId = customerId;
  if (branchId)   where.branchId   = branchId;

  if (startDate || endDate) {
    where.startedAt = {};
    if (startDate) where.startedAt.gte = new Date(startDate);
    if (endDate)   where.startedAt.lte = new Date(endDate);
  }

  const [sessions, total] = await Promise.all([
    findAll({ skip, take, where }),
    count(where),
  ]);

  return {
    data: sessions,
    meta: paginationMeta(total, pageNum, limitNum),
  };
};

const getById = async (id) => {
  const session = await findById(id);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);
  return session;
};

const createSession = async (body) => {
  const { customerId, branchId, appointmentId, startedAt, notes } = body;

  const customer = await findCustomerById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  const branch = await findBranchById(branchId);
  if (!branch) throw new AppError("Branch not found", StatusCodes.NOT_FOUND);

  if (appointmentId) {
    const appointment = await findAppointmentById(appointmentId);
    if (!appointment) throw new AppError("Appointment not found", StatusCodes.NOT_FOUND);
  }

  const data = {
    customerId,
    branchId,
    notes: notes ?? null,
    ...(appointmentId && { appointmentId }),
    ...(startedAt     && { startedAt: new Date(startedAt) }),
  };

  return create(data);
};

const updateSession = async (id, body) => {
  const session = await findById(id);
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

  const { completedAt, notes } = body;

  const data = {};
  if (completedAt !== undefined) data.completedAt = completedAt ? new Date(completedAt) : null;
  if (notes       !== undefined) data.notes       = notes;

  return update(id, data);
};

module.exports = { getAll, getById, createSession, updateSession };
