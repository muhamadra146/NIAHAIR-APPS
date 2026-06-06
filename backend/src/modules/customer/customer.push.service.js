const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { findById } = require("./customer.repository");
const { mapCustomerToAccurate } = require("./customer.push.mapper");
const { updateAfterPush, markSyncFailed, findCustomersMissingCustomerNo, findFailedSyncs } = require("./customer.push.repository");

const ACCURATE_CUSTOMER_SAVE   = "/customer/save.do";
const ACCURATE_CUSTOMER_DETAIL = (id) => `/customer/detail.do?id=${id}`;

// ── Fetch customerNo from Accurate detail endpoint ────────────────────
// Called when save.do response omits customerNo.
const fetchCustomerNoFromAccurate = async (accurateId) => {
  try {
    const detail = await accurateRequest(ACCURATE_CUSTOMER_DETAIL(accurateId));
    if (detail.s && detail.d?.no) return detail.d.no;
    console.error(`[accurate customer sync] detail.do missing customerNo for accurateId=${accurateId}`);
  } catch (err) {
    console.error(`[accurate customer sync] detail.do failed accurateId=${accurateId}`, err.message);
  }
  return null;
};

// ── Push local customer to Accurate ──────────────────────────────────
const pushCustomerToAccurate = async (customerId) => {
  console.log(`[accurate customer sync] start customerId=${customerId}`);

  const customer = await findById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  if (customer.accurateCustomerId) {
    return { alreadySynced: true, accurateCustomerId: customer.accurateCustomerId };
  }

  const payload = mapCustomerToAccurate(customer);

  let response;
  try {
    response = await accurateRequest(ACCURATE_CUSTOMER_SAVE, {
      method: "POST",
      body:   payload,
    });
  } catch (err) {
    console.error(`[accurate customer sync] failed customerId=${customerId}`, err.message);
    await markSyncFailed(customerId, err.message);
    throw err;
  }

  if (!response.s) {
    const errMsg =
      typeof response.d === "string"
        ? response.d
        : response.message || "Accurate API rejected customer push";
    console.error(`[accurate customer sync] failed customerId=${customerId}`, errMsg);
    await markSyncFailed(customerId, errMsg);
    throw new AppError(errMsg, StatusCodes.BAD_GATEWAY);
  }

  const accurateId = response.r?.id;
  if (!accurateId) {
    const errMsg = "Accurate did not return customer ID";
    console.error(`[accurate customer sync] failed — ${errMsg}`);
    await markSyncFailed(customerId, errMsg);
    throw new AppError(errMsg, StatusCodes.BAD_GATEWAY);
  }

  // save.do may omit customerNo — fetch from detail.do if missing
  let customerNo = response.r?.customerNo || null;
  if (!customerNo) {
    console.log(`[accurate customer sync] customerNo missing from save response — calling detail.do`);
    customerNo = await fetchCustomerNoFromAccurate(accurateId);
  }

  await updateAfterPush(customerId, {
    accurateCustomerId: parseInt(accurateId, 10),
    customerNo,
  });

  console.log(
    `[accurate customer sync] success customerId=${customerId}` +
    ` accurateId=${accurateId} customerNo=${customerNo}`
  );

  return {
    alreadySynced:      false,
    accurateCustomerId: parseInt(accurateId, 10),
    customerNo,
  };
};

// ── Repair: back-fill missing customerNo ─────────────────────────────
// Finds all customers that were pushed to Accurate but came back without
// a customerNo (e.g. save.do returned before Accurate assigned a number
// and detail.do was also unavailable at that moment).
const repairMissingCustomerNo = async () => {
  const customers = await findCustomersMissingCustomerNo();
  console.log(`[accurate customer repair] found ${customers.length} customer(s) missing customerNo`);

  let repaired = 0;
  let failed   = 0;

  for (const customer of customers) {
    try {
      const detail = await accurateRequest(ACCURATE_CUSTOMER_DETAIL(customer.accurateCustomerId));

      if (!detail.s || !detail.d?.no) {
        console.error(
          `[accurate customer repair] customerNo unavailable` +
          ` customerId=${customer.id} accurateId=${customer.accurateCustomerId}`
        );
        failed++;
        continue;
      }

      await updateAfterPush(customer.id, {
        accurateCustomerId: customer.accurateCustomerId,
        customerNo:         detail.d.no,
      });

      console.log(
        `[accurate customer repair] repaired customerId=${customer.id}` +
        ` customerNo=${detail.d.no}`
      );
      repaired++;
    } catch (err) {
      console.error(
        `[accurate customer repair] failed customerId=${customer.id}`,
        err.message
      );
      failed++;
    }
  }

  return { total: customers.length, repaired, failed };
};

// ── Retry all FAILED local syncs ──────────────────────────────────────
const retryFailedCustomerSync = async () => {
  const customers = await findFailedSyncs();
  console.log(`[accurate customer retry] found ${customers.length} failed sync(s)`);

  let retried   = 0;
  let succeeded = 0;
  let failed    = 0;

  for (const customer of customers) {
    retried++;
    try {
      await pushCustomerToAccurate(customer.id);
      succeeded++;
      console.log(`[accurate customer retry] succeeded customerId=${customer.id}`);
    } catch (err) {
      // markSyncFailed is already called inside pushCustomerToAccurate
      console.error(`[accurate customer retry] still failing customerId=${customer.id}`, err.message);
      failed++;
    }
  }

  return { retried, succeeded, failed };
};

module.exports = { pushCustomerToAccurate, repairMissingCustomerNo, retryFailedCustomerSync };
