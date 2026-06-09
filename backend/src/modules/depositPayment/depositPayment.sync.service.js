const { accurateRequest } = require("../accurate/accurate.client");
const { findDepositPaymentForSync, markDepositPaymentSynced } = require("./depositPayment.sync.repository");
const { mapDepositPaymentToAccurate }                         = require("./depositPayment.sync.mapper");

const ACCURATE_RECEIPT_SAVE = "/sales-receipt/save.do";

const syncDepositPaymentToAccurate = async (depositPaymentId) => {
  console.log(`[deposit-payment sync] start id=${depositPaymentId}`);

  const dp = await findDepositPaymentForSync(depositPaymentId);
  if (!dp) throw new Error(`DepositPayment not found: ${depositPaymentId}`);

  // Idempotency — skip if already pushed to Accurate
  if (dp.accurateReceiptId) {
    return { skipped: true, reason: "Already synced" };
  }

  // Validate deposit dependency
  if (!dp.deposit?.accurateDepositId) {
    throw new Error("Deposit not synced to Accurate yet");
  }

  // Validate customer dependency
  if (!dp.deposit?.customer?.customerNo) {
    throw new Error("Customer not synced to Accurate yet");
  }

  // Validate cash account mapping
  if (!dp.paymentMethod?.cashAccount) {
    throw new Error("Payment method has no cash account mapping");
  }
  if (!dp.paymentMethod.cashAccount.accurateAccountId) {
    throw new Error("Cash account not synced to Accurate yet");
  }

  const payload = mapDepositPaymentToAccurate(dp);

  console.log("[deposit-payment sync payload]", JSON.stringify(payload));

  const response = await accurateRequest(ACCURATE_RECEIPT_SAVE, {
    method: "POST",
    body:   payload,
  });

  // Accurate sales-receipt response: created entity in response.r
  const receipt = response.r ?? response.d;
  if (!response.s || !receipt?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateReceiptId     = receipt.id;
  const accurateReceiptNumber = receipt.number ?? null;

  await markDepositPaymentSynced({
    id: depositPaymentId,
    accurateReceiptId,
    accurateReceiptNumber,
  });

  console.log(
    `[deposit-payment sync] success id=${depositPaymentId}` +
    ` accurateId=${accurateReceiptId} number=${accurateReceiptNumber}`
  );

  return { synced: true, accurateReceiptId, accurateReceiptNumber };
};

module.exports = { syncDepositPaymentToAccurate };
