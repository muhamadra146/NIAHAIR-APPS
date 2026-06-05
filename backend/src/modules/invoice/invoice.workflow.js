const { generateCommission }       = require("../commission/commission.service");
const { generateStockMovement }    = require("../inventory/inventory.service");
const {
  findInvoiceWithRelations,
  completeInvoiceRelations,
} = require("../payment/payment.repository");

// ── Shared post-PAID workflow ─────────────────────────────────────────
// Called from both payment.service (payment causes PAID)
// and invoice.service (deposit fully covers invoice on create).
// Each sub-step is idempotent — safe to call more than once.

const completeInvoiceWorkflow = async (invoiceId, userId) => {
  const fullInvoice = await findInvoiceWithRelations(invoiceId);

  const incompleteSessions = fullInvoice.treatmentSessions
    .filter((s) => s.completedAt === null)
    .map((s) => s.id);

  const COMPLETABLE = ["BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS"];
  const appt = fullInvoice.appointment;
  const shouldCompleteAppointment =
    fullInvoice.appointmentId !== null &&
    appt !== null &&
    COMPLETABLE.includes(appt.status);

  if (incompleteSessions.length > 0 || shouldCompleteAppointment) {
    await completeInvoiceRelations({
      sessionIds:           incompleteSessions,
      appointmentId:        shouldCompleteAppointment ? fullInvoice.appointmentId : null,
      oldAppointmentStatus: shouldCompleteAppointment ? appt.status               : null,
      userId,
    });
  }
};

// Order: sessions/appointment → commission → stock
const handleInvoicePaid = async (invoiceId, userId) => {
  await completeInvoiceWorkflow(invoiceId, userId);
  await generateCommission(invoiceId);
  await generateStockMovement(invoiceId);
};

module.exports = { handleInvoicePaid };
