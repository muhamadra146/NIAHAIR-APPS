const { accurateRequest }                     = require("../accurate/accurate.client");
const { findDepositForSync, markDepositSynced } = require("./deposit.sync.repository");
const { mapDepositToAccurate }                  = require("./deposit.sync.mapper");

const ACCURATE_DEPOSIT_SAVE   = "/sales-invoice/save.do";
const ACCURATE_DEPOSIT_DELETE = "/sales-invoice/delete.do";

const syncDepositToAccurate = async (depositId) => {
  console.log(`[deposit sync] start depositId=${depositId}`);

  const deposit = await findDepositForSync(depositId);

  if (!deposit) throw new Error(`Deposit not found: ${depositId}`);

  // Idempotency — skip if already synced to Accurate
  if (deposit.accurateDepositId) {
    return { skipped: true, reason: "Already synced" };
  }

  const customer = deposit.customer;
  // accurateCustomerId confirms the customer record exists in Accurate;
  // customerNo is required for the payload. If either is missing the CUSTOMER
  // queue is likely still pending — throw so SyncQueue retries this job later.
  if (!customer?.accurateCustomerId || !customer?.customerNo) {
    throw new Error("Customer not synced to Accurate yet");
  }

  const payload = mapDepositToAccurate(deposit);

  console.log("[deposit sync payload]", JSON.stringify(payload));

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

const updateDepositInAccurate = async (depositId) => {
  console.log(`[deposit sync] update in Accurate depositId=${depositId}`);

  const deposit = await findDepositForSync(depositId);
  if (!deposit?.accurateDepositId) return { skipped: true };

  const payload = {
    ...mapDepositToAccurate(deposit),
    id: deposit.accurateDepositId,
  };

  const response = await accurateRequest(ACCURATE_DEPOSIT_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s) {
    throw new Error(`Accurate update error: ${JSON.stringify(response)}`);
  }

  console.log(`[deposit sync] updated in Accurate depositId=${depositId}`);
  return { updated: true };
};

const deleteDepositFromAccurate = async (accurateDepositId) => {
  console.log(`[deposit sync] delete from Accurate accurateDepositId=${accurateDepositId}`);

  try {
    const response = await accurateRequest(ACCURATE_DEPOSIT_DELETE, {
      method: "POST",
      body:   { id: accurateDepositId },
    });

    if (!response.s) {
      console.warn(`[deposit sync] Accurate delete failed (ignored): ${JSON.stringify(response)}`);
    } else {
      console.log(`[deposit sync] deleted from Accurate accurateDepositId=${accurateDepositId}`);
    }
  } catch (err) {
    console.warn(`[deposit sync] Accurate delete error (ignored): ${err.message}`);
  }
};

module.exports = { syncDepositToAccurate, updateDepositInAccurate, deleteDepositFromAccurate };
