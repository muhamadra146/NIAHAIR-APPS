const { accurateRequest }   = require("../accurate/accurate.client");
const { findPaymentForSync, markPaymentSynced } = require("./payment.sync.repository");
const { mapPaymentToAccurate }                  = require("./payment.sync.mapper");

const ACCURATE_RECEIPT_SAVE   = "/sales-receipt/save.do";
const ACCURATE_RECEIPT_DELETE = "/sales-receipt/delete.do";

const syncPaymentToAccurate = async (paymentId) => {
  console.log(`[payment sync] start paymentId=${paymentId}`);

  const payment = await findPaymentForSync(paymentId);
  if (!payment) throw new Error(`Payment not found: ${paymentId}`);

  // Idempotency — skip if already pushed to Accurate
  if (payment.accurateReceiptId) {
    return { skipped: true, reason: "Already synced" };
  }

  // Validate invoice dependency
  if (!payment.invoice?.accurateInvoiceId) {
    throw new Error("Invoice not synced to Accurate yet");
  }

  // Validate customer dependency
  if (!payment.invoice?.customer?.customerNo) {
    throw new Error("Customer not synced to Accurate yet");
  }

  // Validate cash account mapping
  if (!payment.paymentMethod?.cashAccount) {
    throw new Error("Payment method has no cash account mapping");
  }

  if (!payment.paymentMethod.cashAccount.accurateAccountId) {
    throw new Error("Cash account not synced to Accurate yet");
  }

  const payload = mapPaymentToAccurate(payment);

  console.log("[payment sync payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_RECEIPT_SAVE, {
    method: "POST",
    body:   payload,
  });

  // Accurate sales-receipt response: created entity is in response.r (same as sales-invoice)
  // response.d is an array of success messages e.g. ["Penerimaan Penjualan berhasil disimpan"]
  const receipt = response.r ?? response.d;
  if (!response.s || !receipt?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateReceiptId     = receipt.id;
  const accurateReceiptNumber = receipt.number ?? null;

  await markPaymentSynced({
    id: paymentId,
    accurateReceiptId,
    accurateReceiptNumber,
  });

  console.log(
    `[payment sync] success paymentId=${paymentId}` +
    ` accurateId=${accurateReceiptId} number=${accurateReceiptNumber}`
  );

  return { synced: true, accurateReceiptId, accurateReceiptNumber };
};

const deletePaymentFromAccurate = async (accurateReceiptId) => {
  console.log(`[payment sync] delete from Accurate accurateReceiptId=${accurateReceiptId}`);
  try {
    const response = await accurateRequest(ACCURATE_RECEIPT_DELETE, {
      method: "POST",
      body:   { id: accurateReceiptId },
    });
    if (!response.s) {
      console.warn(`[payment sync] Accurate delete failed (ignored): ${JSON.stringify(response)}`);
    } else {
      console.log(`[payment sync] deleted from Accurate accurateReceiptId=${accurateReceiptId}`);
    }
  } catch (err) {
    console.warn(`[payment sync] Accurate delete error (ignored): ${err.message}`);
  }
};

module.exports = { syncPaymentToAccurate, deletePaymentFromAccurate };
