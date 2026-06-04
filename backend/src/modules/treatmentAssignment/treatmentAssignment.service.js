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
  const { employeeId, workQty, notes } = body;

  // 1 — treatment item must exist
  const treatmentItem = await findTreatmentItemById(treatmentItemId);
  if (!treatmentItem) throw new AppError("Treatment item not found", StatusCodes.NOT_FOUND);

  // 2 — employee must exist and be active
  const employee = await findEmployeeById(employeeId);
  if (!employee) throw new AppError("Employee not found", StatusCodes.NOT_FOUND);
  if (!employee.isActive) {
    throw new AppError("Employee is not active", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 3 — quota check: existing assigned + new must not exceed maxWork
  const maxWork      = calcMaxWork(treatmentItem);
  const existingSum  = await sumWorkQtyByItem(treatmentItemId);
  const afterInsert  = existingSum + workQty;

  if (afterInsert > maxWork) {
    throw new AppError(
      `Work quota exceeded. Max: ${maxWork}, already assigned: ${existingSum}, requested: ${workQty}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return create({
    treatmentItemId,
    employeeId,
    workQty,
    notes: notes ?? null,
  });
};

const updateAssignment = async (id, body) => {
  const assignment = await findById(id);
  if (!assignment) throw new AppError("Assignment not found", StatusCodes.NOT_FOUND);

  const { workQty, notes } = body;

  if (workQty !== undefined) {
    // Re-validate quota excluding this assignment's current workQty
    const treatmentItem = assignment.treatmentItem;
    const maxWork       = calcMaxWork(treatmentItem);
    const otherSum      = await sumWorkQtyByItem(assignment.treatmentItem.id, id);
    const afterUpdate   = otherSum + workQty;

    if (afterUpdate > maxWork) {
      throw new AppError(
        `Work quota exceeded. Max: ${maxWork}, other assignments: ${otherSum}, requested: ${workQty}`,
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }
  }

  const data = {};
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
