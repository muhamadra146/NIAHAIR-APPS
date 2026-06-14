const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const {
  findByItem,
  findById,
  create,
  update,
  deleteById,
  sumWorkQtyByItem,
  findTreatmentItemById,
  findEmployeeById,
} = require("./treatmentAssignment.repository");

// ── Helpers ───────────────────────────────────────────────────────────

// maxWork = qty ordered × conversionFactor snapshot (e.g. 1 MEDIUM × 100 = 100 helai)
const calcMaxWork = (treatmentItem) =>
  Number(treatmentItem.qty) * Number(treatmentItem.conversionSnapshot);

// ── Service ───────────────────────────────────────────────────────────

const getByItem = async (treatmentItemId) => {
  const item = await findTreatmentItemById(treatmentItemId);
  if (!item) throw new AppError("Treatment item not found", StatusCodes.NOT_FOUND);
  return findByItem(treatmentItemId);
};

const getById = async (id) => {
  const assignment = await findById(id);
  if (!assignment) throw new AppError("Assignment not found", StatusCodes.NOT_FOUND);
  return assignment;
};

const createAssignment = async (treatmentItemId, body) => {
  const { employeeId, slotKey, workQty, notes } = body;

  // 1 — treatment item must exist
  const treatmentItem = await findTreatmentItemById(treatmentItemId);
  if (!treatmentItem) throw new AppError("Treatment item not found", StatusCodes.NOT_FOUND);

  // 2 — employee must exist and be active
  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  if (!employee.isActive) {
    throw new AppError("Employee is not active", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 3 — validate workQty does not exceed maxWork per individual assignment
  const maxWork = calcMaxWork(treatmentItem);
  if (workQty > maxWork) {
    throw new AppError(
      `Work qty exceeds item max. Max per assignment: ${maxWork}, requested: ${workQty}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return create({
    treatmentItemId,
    employeeId,
    slotKey: slotKey ?? null,
    workQty,
    notes: notes ?? null,
  });
};

const updateAssignment = async (id, body) => {
  const assignment = await findById(id);
  if (!assignment) throw new AppError("Assignment not found", StatusCodes.NOT_FOUND);

  const { slotKey, workQty, notes } = body;

  if (workQty !== undefined) {
    const treatmentItem = assignment.treatmentItem;
    const maxWork       = calcMaxWork(treatmentItem);
    if (workQty > maxWork) {
      throw new AppError(
        `Work qty exceeds item max. Max per assignment: ${maxWork}, requested: ${workQty}`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  const data = {};
  if (slotKey !== undefined) data.slotKey = slotKey;
  if (workQty !== undefined) data.workQty = workQty;
  if (notes   !== undefined) data.notes   = notes;

  return update(id, data);
};

const deleteAssignment = async (id) => {
  const assignment = await findById(id);
  if (!assignment) throw new AppError("Assignment not found", StatusCodes.NOT_FOUND);
  await deleteById(id);
};

module.exports = {
  getByItem,
  getById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
