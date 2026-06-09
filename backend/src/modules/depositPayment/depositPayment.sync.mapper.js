/**
 * Maps a local DepositPayment to an Accurate sales-receipt payload.
 * Accurate treats a sales down payment as a regular sales invoice (created via
 * /sales-invoice/save.do with salesDownPayment:true), so payment uses the
 * standard detailInvoice array — same as normal invoice payment.
 * Pure function — no DB, no API.
 */

const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const buildDescription = (dp) => {
  const lines = [`Deposit Payment ${dp.paymentNo}`];
  if (dp.deposit.accurateDepositNumber) {
    lines.push(`Deposit ${dp.deposit.accurateDepositNumber}`);
  }
  if (dp.notes) lines.push(dp.notes);
  return lines.join("\n");
};

const mapDepositPaymentToAccurate = (dp) => ({
  customerNo:    dp.deposit.customer.customerNo,
  transDate:     formatDate(dp.paidAt),
  description:   buildDescription(dp),
  bankId:        dp.paymentMethod.cashAccount.accurateAccountId,
  paymentMethod: "BANK_TRANSFER",
  chequeAmount:  Number(dp.amount),
  totalPayment:  Number(dp.amount),
  detailInvoice: [
    {
      invoiceId:     dp.deposit.accurateDepositId,
      paymentAmount: Number(dp.amount),
    },
  ],
});

module.exports = { mapDepositPaymentToAccurate };
