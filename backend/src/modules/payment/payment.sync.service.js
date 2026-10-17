const logger = require('../../utils/logger');
const { accurateRequest }                       = require("../accurate/accurate.client");
const { getAccurateBranchId }                   = require("../branch/branch.repository");
const prisma                                    = require("../../config/prisma");
const { findPaymentForSync, markPaymentSynced } = require("./payment.sync.repository");
const { mapPaymentToAccurate }                  = require("./payment.sync.mapper");

const ACCURATE_RECEIPT_SAVE   = "/sales-receipt/save.do";
const ACCURATE_RECEIPT_DELETE = "/sales-receipt/delete.do";

const ACCURATE_INVOICE_DETAIL = "/sales-invoice/detail.do";
const ROUNDING_TOLERANCE      = 1; // rupiah

// Nominal penerimaan untuk Accurate: sama dengan ERP, kecuali selisih pembulatan PPN < Rp 1
const resolveReceiptAmount = async (payment) => {
  const amount = Number(payment.amount);
  try {
    const resp  = await accurateRequest(`${ACCURATE_INVOICE_DETAIL}?id=${payment.invoice.accurateInvoiceId}`, { method: "GET" });
    const owing = Number(resp.d?.primeOwing);
    if (resp.s && Number.isFinite(owing) && owing > 0 && amount > owing && amount - owing < ROUNDING_TOLERANCE) {
      const adjusted = Math.floor(owing * 100) / 100;
      logger.warn(`[payment sync] selisih pembulatan PPN: ERP ${amount} → Accurate ${adjusted} (paymentId=${payment.id})`);
      return adjusted;
    }
  } catch (err) {
    logger.warn(`[payment sync] gagal membaca sisa piutang Accurate (lanjut nominal ERP): ${err.message}`);
  }
  return amount;
};

const syncPaymentToAccurate = async (paymentId) => {
  logger.info(`[payment sync] start paymentId=${paymentId}`);

  const payment = await findPaymentForSync(paymentId);
  if (!payment) throw new Error(`Pembayaran tidak ditemukan: ${paymentId}`);

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

  // Look up Accurate branch ID via the invoice's branch
  const paymentBranch = await prisma.payment.findUnique({
    where:  { id: paymentId },
    select: { invoice: { select: { branchId: true } } },
  });
  const accurateBranchId = await getAccurateBranchId(paymentBranch?.invoice?.branchId);

  // Accurate membulatkan PPN ke rupiah penuh, ERP menyimpan sen. Pada faktur PPN exclusive
  // dengan pajak pecahan, piutang Accurate bisa lebih kecil < Rp 1 dari sisa ERP sehingga
  // pelunasan penuh ditolak "melebihi nilai piutang" (P4). Selisih pembulatan (< Rp 1) itu
  // diserap: penerimaan dikirim sebesar sisa piutang Accurate.
  const syncAmount = await resolveReceiptAmount(payment);
  const payload = mapPaymentToAccurate(
    syncAmount === Number(payment.amount) ? payment : { ...payment, amount: syncAmount },
    accurateBranchId,
  );

  logger.info("[payment sync payload]", JSON.stringify(payload));

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

  logger.info(
    `[payment sync] success paymentId=${paymentId}` +
    ` accurateId=${accurateReceiptId} number=${accurateReceiptNumber}`
  );

  return { synced: true, accurateReceiptId, accurateReceiptNumber };
};

const deletePaymentFromAccurate = async (accurateReceiptId) => {
  logger.info(`[payment sync] delete from Accurate accurateReceiptId=${accurateReceiptId}`);
  try {
    const response = await accurateRequest(ACCURATE_RECEIPT_DELETE, {
      method: "POST",
      body:   { id: accurateReceiptId },
    });
    if (!response.s) {
      logger.warn(`[payment sync] Accurate delete failed (ignored): ${JSON.stringify(response)}`);
    } else {
      logger.info(`[payment sync] deleted from Accurate accurateReceiptId=${accurateReceiptId}`);
    }
  } catch (err) {
    logger.warn(`[payment sync] Accurate delete error (ignored): ${err.message}`);
  }
};

module.exports = { syncPaymentToAccurate, deletePaymentFromAccurate };
