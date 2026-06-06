const { accurateRequest }                     = require("../accurate/accurate.client");
const { findDepositForSync, markDepositSynced } = require("./deposit.sync.repository");
const { mapDepositToAccurate }                  = require("./deposit.sync.mapper");

const ACCURATE_DEPOSIT_SAVE = "/sales-invoice/save.do";

const syncDepositToAccurate = async (depositId) => {
  console.log(`[deposit sync] start depositId=${depositId}`);

  const deposit = await findDepositForSync(depositId);

  if (!deposit) throw new Error(`Deposit not found: ${depositId}`);

  // Idempotency — skip if already synced to Accurate
  if (deposit.accurateDepositId) {
    return { skipped: true, reason: "Already synced" };
  }

  const customer = deposit.appointment?.customer;
  // accurateCustomerId confirms the customer record exists in Accurate;
  // customerNo is required for the payload. If either is missing the CUSTOMER
  // queue is likely still pending — throw so SyncQueue retries this job later.
  if (!customer?.accurateCustomerId || !customer?.customerNo) {
    throw new Error("Customer not synced to Accurate yet");
  }

  const payload = mapDepositToAccurate(deposit);

  // Use accurateRequest — owns auth headers and base URL.
  // Endpoint is relative; accurate.client prepends env.accurate.baseUrl.
  const response = await accurateRequest(ACCURATE_DEPOSIT_SAVE, {
    method: "POST",
    body:   payload,
  });

  // response.r = created entity, response.d = message / error detail
  if (!response.s || !response.r?.id) {
    throw new Error(`Accurate API error: ${JSON.stringify(response)}`);
  }

  const accurateId     = response.r.id;
  const accurateNumber = response.r.number ?? response.r.no ?? null;

  await markDepositSynced({
    id:                    depositId,
    accurateDepositId:     accurateId,
    accurateDepositNumber: accurateNumber,
  });

  console.log(
    `[deposit sync] success depositId=${depositId}` +
    ` accurateId=${accurateId} number=${accurateNumber}`
  );

  return { synced: true, accurateId, accurateNumber };
};

module.exports = { syncDepositToAccurate };
