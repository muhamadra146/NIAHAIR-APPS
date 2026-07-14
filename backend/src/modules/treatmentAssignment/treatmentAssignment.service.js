const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const {
  findByItem,
  findById,
  create,
  update,
  deleteById,
  sumWorkQtyByItem,
  sumWorkQtyBySlot,
  findTreatmentItemById,
  findEmployeeById,
  countByItem,
  updateManyWorkQty,
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

  const isService = treatmentItem.item?.itemType === "SERVICE";

  if (isService) {
    // Auto-split: priceSnapshot ÷ (jumlah assignment saat ini + 1)
    const currentCount = await countByItem(treatmentItemId);
    const newCount     = currentCount + 1;
    const splitQty     = Number(treatmentItem.priceSnapshot) / newCount;

    if (currentCount > 0) {
      await updateManyWorkQty(treatmentItemId, splitQty);
    }

    return create({
      treatmentItemId,
      employeeId,
      slotKey: slotKey ?? null,
      workQty: splitQty,
      notes:   notes ?? null,
    });
  }

  // INVENTORY: workQty wajib diisi manual
  if (workQty === undefined || workQty === null) {
    throw new AppError("workQty wajib diisi untuk item inventory", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  const maxWork = calcMaxWork(treatmentItem);

  // Validasi per slotKey — setiap role (stylist/asisten) punya kuota mandiri sebesar maxWork
  const usedBySlot = slotKey ? await sumWorkQtyBySlot(treatmentItemId, slotKey) : 0;
  const remaining  = maxWork - usedBySlot;

  if (workQty > remaining) {
    throw new AppError(
      `Work qty melebihi sisa untuk slot ini. Sisa: ${remaining}, diminta: ${workQty}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  return create({
    treatmentItemId,
    employeeId,
    slotKey: slotKey ?? null,
    workQty,
    notes:   notes ?? null,
  });
};

const updateAssignment = async (id, body) => {
  const assignment = await findById(id);
  if (!assignment) throw new AppError("Assignment not found", StatusCodes.NOT_FOUND);

  const { slotKey, workQty, notes } = body;

  if (workQty !== undefined) {
    const treatmentItem  = assignment.treatmentItem;
    const maxWork        = calcMaxWork(treatmentItem);
    const effectiveSlot  = slotKey ?? assignment.slotKey;
    const usedBySlot     = effectiveSlot
      ? await sumWorkQtyBySlot(assignment.treatmentItemId, effectiveSlot, id)
      : 0;
    const remaining      = maxWork - usedBySlot;

    if (workQty > remaining) {
      throw new AppError(
        `Work qty melebihi sisa untuk slot ini. Sisa: ${remaining}, diminta: ${workQty}`,
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

  const isService       = assignment.treatmentItem?.item?.itemType === "SERVICE";
  const treatmentItemId = assignment.treatmentItem?.id;
  const priceSnapshot   = Number(assignment.treatmentItem?.priceSnapshot ?? 0);

  await deleteById(id);

  // Setelah hapus, hitung ulang workQty rata untuk jasa
  if (isService && treatmentItemId && priceSnapshot > 0) {
    const remainingCount = await countByItem(treatmentItemId);
    if (remainingCount > 0) {
      await updateManyWorkQty(treatmentItemId, priceSnapshot / remainingCount);
    }
  }
};

module.exports = {
  getByItem,
  getById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
