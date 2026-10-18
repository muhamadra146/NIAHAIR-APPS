/**
 * Maps a local DepositPayment to an Accurate sales-receipt payload.
 * Accurate treats a sales down payment as a regular sales invoice (created via
 * /sales-invoice/save.do with salesDownPayment:true), so payment uses the
 * standard detailInvoice array — same as normal invoice payment.
 * Pure function — no DB, no API.
 */

const { wibDateStr } = require("../../utils/date");

// dd/mm/yyyy menurut kalender WIB (tidak tergantung timezone server)
const formatDate = (date) => {
  const [y, m, d] = wibDateStr(date).split("-");
  return `${d}/${m}/${y}`;
};

const buildDescription = (dp) => {
  const lines = [`Deposit Payment ${dp.paymentNo}`];
  if (dp.deposit.accurateDepositNumber) {
    lines.push(`Deposit ${dp.deposit.accurateDepositNumber}`);
  }
  if (dp.notes) lines.push(dp.notes);
  return lines.join("\n");
};

const mapDepositPaymentToAccurate = (dp, accurateBranchId = null) => ({
  customerNo:    dp.deposit.customer.customerNo,
  transDate:     formatDate(dp.paidAt),
  description:   buildDescription(dp),
  bankId:        dp.paymentMethod.cashAccount.accurateAccountId,
  paymentMethod: "BANK_TRANSFER",
  chequeAmount:  Number(dp.amount),
  totalPayment:  Number(dp.amount),
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
  detailInvoice: [
    {
      invoiceId:     dp.deposit.accurateDepositId,
      paymentAmount: Number(dp.amount),
    },
  ],
});

module.exports = { mapDepositPaymentToAccurate };
