/**
 * Maps a local Payment (with invoice + customer + paymentMethod + cashAccount)
 * to an Accurate sales-receipt payload. Pure function — no DB, no API.
 *
 * Verified field names from Accurate sales-receipt/save.do response:
 *   bankId (NOT bankAccountId) — Accurate's GL CASH_BANK account id
 *   detailInvoice[].invoiceId / .paymentAmount
 */

const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const buildDescription = (payment) => {
  const lines = [
    `Payment ${payment.paymentNo}`,
    `Invoice ${payment.invoice.invoiceNo}`,
  ];
  if (payment.invoice.notes) lines.push(payment.invoice.notes);
  return lines.join("\n");
};

const mapPaymentToAccurate = (payment) => ({
  customerNo:    payment.invoice.customer.customerNo,
  transDate:     formatDate(payment.paymentDate),
  description:   buildDescription(payment),
  bankId:        payment.paymentMethod.cashAccount.accurateAccountId,
  paymentMethod: "BANK_TRANSFER",
  chequeAmount:  Number(payment.amount),
  totalPayment:  Number(payment.amount),
  detailInvoice: [
    {
      invoiceId:     payment.invoice.accurateInvoiceId,
      paymentAmount: Number(payment.amount),
    },
  ],
});

module.exports = { mapPaymentToAccurate };
