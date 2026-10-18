/**
 * Maps a local Deposit (with customer + optional appointment) to an Accurate
 * sales down payment payload. Pure data transformation — no DB, no API.
 */

const { wibDateStr } = require("../../utils/date");

// dd/mm/yyyy menurut kalender WIB (tidak tergantung timezone server)
const formatDate = (date) => {
  const [y, m, d] = wibDateStr(date).split("-");
  return `${d}/${m}/${y}`;
};

const mapDepositToAccurate = (deposit, accurateBranchId = null) => ({
  customerNo:       deposit.customer.customerNo,
  // Tanggal Faktur DP = tanggal deposit yang diisi user (fallback createdAt).
  // Pembayaran DP divalidasi tidak boleh sebelum tanggal ini.
  transDate:        formatDate(deposit.paidAt ?? deposit.createdAt),
  salesDownPayment: true,
  invoiceDp:        true,
  inputDownPayment: Number(deposit.amount),
  description:      (() => {
    const base = deposit.appointment?.bookingNo
      ? `Deposit ${deposit.appointment.bookingNo}`
      : `Deposit ${deposit.customer.customerNo ?? deposit.id}`;
    return deposit.notes ? `${base}\n${deposit.notes}` : base;
  })(),
  ...(accurateBranchId ? { branchId: accurateBranchId } : {}),
});

module.exports = { mapDepositToAccurate };
