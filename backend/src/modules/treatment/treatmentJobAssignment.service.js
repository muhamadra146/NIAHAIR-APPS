const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const prisma = require("../../config/prisma");
const repo = require("./treatmentJobAssignment.repository");

// ── Get ───────────────────────────────────────────────────────────────

const getJobAssignments = async (sessionId) => {
  const session = await prisma.treatmentSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

  return repo.findBySession(sessionId);
};

// ── Upsert ────────────────────────────────────────────────────────────

const upsertJobAssignments = async (sessionId, body) => {
  const session = await prisma.treatmentSession.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
  if (!session) throw new AppError("Treatment session not found", StatusCodes.NOT_FOUND);

  const { assignments = [] } = body;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new AppError("assignments array is required and cannot be empty", StatusCodes.UNPROCESSABLE_ENTITY);
  }

  // Validasi: setiap treatmentItem harus milik session ini
  const treatmentItemIds = [...new Set(assignments.map((a) => a.treatmentItemId))];
  const ownedItems = await prisma.treatmentItem.findMany({
    where: { id: { in: treatmentItemIds }, treatmentSessionId: sessionId },
    select: { id: true },
  });

  const ownedSet = new Set(ownedItems.map((i) => i.id));
  const unauthorized = treatmentItemIds.filter((id) => !ownedSet.has(id));
  if (unauthorized.length > 0) {
    throw new AppError(
      `Treatment item(s) tidak ditemukan di session ini: ${unauthorized.join(", ")}`,
      StatusCodes.UNPROCESSABLE_ENTITY
    );
  }

  await repo.upsertMany(assignments);

  // Return fresh data untuk UI
  return repo.findBySession(sessionId);
};

module.exports = { getJobAssignments, upsertJobAssignments };
