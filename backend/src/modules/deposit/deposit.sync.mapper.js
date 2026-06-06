/**
 * Maps a local Deposit (with appointment + customer) to an Accurate
 * sales down payment payload. Pure data transformation — no DB, no API.
 */

const formatDate = (date) => {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const mapDepositToAccurate = (deposit) => ({
  customerNo:       deposit.appointment.customer.customerNo,
  transDate:        formatDate(deposit.paidAt),
  salesDownPayment: true,
  invoiceDp:        true,
  inputDownPayment: Number(deposit.amount),
  description:      `Deposit ${deposit.appointment.bookingNo}`,
});

module.exports = { mapDepositToAccurate };
