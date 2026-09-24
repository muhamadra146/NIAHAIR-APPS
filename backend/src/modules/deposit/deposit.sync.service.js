const logger = require('../../utils/logger');
const { accurateRequest }                     = require("../accurate/accurate.client");
const { getAccurateBranchId }                 = require("../branch/branch.repository");
const prisma                                  = require("../../config/prisma");
const { findDepositForSync, markDepositSynced } = require("./deposit.sync.repository");
const { mapDepositToAccurate }                  = require("./deposit.sync.mapper");

const ACCURATE_DEPOSIT_SAVE   = "/sales-invoice/save.do";
const ACCURATE_DEPOSIT_DELETE = "/sales-invoice/delete.do";

const syncDepositToAccurate = async (depositId) => {
  logger.info(`[deposit sync] start depositId=${depositId}`);

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

  // Look up Accurate branch ID
  const depositBranch = await prisma.deposit.findUnique({
    where:  { id: depositId },
    select: { branchId: true },
  });
  const accurateBranchId = await getAccurateBranchId(depositBranch?.branchId);

  const payload = mapDepositToAccurate(deposit, accurateBranchId);

  logger.info("[deposit sync payload]", JSON.stringify(payload));

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

  logger.info(
    `[deposit sync] success depositId=${depositId}` +
    ` accurateId=${accurateId} number=${accurateNumber}`
  );

  return { synced: true, accurateId, accurateNumber };
};

const updateDepositInAccurate = async (depositId) => {
  logger.info(`[deposit sync] update in Accurate depositId=${depositId}`);

  const deposit = await findDepositForSync(depositId);
  if (!deposit?.accurateDepositId) return { skipped: true };

  // Resolve branchId → Accurate branch ID (same as create flow)
  const accurateBranchId = await getAccurateBranchId(deposit.branchId);

  const payload = {
    ...mapDepositToAccurate(deposit, accurateBranchId),
    id: deposit.accurateDepositId,
  };

  const response = await accurateRequest(ACCURATE_DEPOSIT_SAVE, {
    method: "POST",
    body:   payload,
  });

  if (!response.s) {
    throw new Error(`Accurate update error: ${JSON.stringify(response)}`);
  }

  logger.info(`[deposit sync] updated in Accurate depositId=${depositId}`);
  return { updated: true };
};

const deleteDepositFromAccurate = async (accurateDepositId) => {
  logger.info(`[deposit sync] delete from Accurate accurateDepositId=${accurateDepositId}`);

  try {
    const response = await accurateRequest(ACCURATE_DEPOSIT_DELETE, {
      method: "POST",
      body:   { id: accurateDepositId },
    });

    if (!response.s) {
      logger.warn(`[deposit sync] Accurate delete failed (ignored): ${JSON.stringify(response)}`);
    } else {
      logger.info(`[deposit sync] deleted from Accurate accurateDepositId=${accurateDepositId}`);
    }
  } catch (err) {
    logger.warn(`[deposit sync] Accurate delete error (ignored): ${err.message}`);
  }
};

module.exports = { syncDepositToAccurate, updateDepositInAccurate, deleteDepositFromAccurate };
