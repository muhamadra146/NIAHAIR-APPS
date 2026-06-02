const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { findById } = require("./customer.repository");
const { mapCustomerToAccurate } = require("./customer.push.mapper");
const { updateAfterPush } = require("./customer.push.repository");

const ACCURATE_CUSTOMER_SAVE = "/customer/save.do";

// TODO: move to background sync job
const pushCustomerToAccurate = async (customerId) => {
  const customer = await findById(customerId);
  if (!customer) throw new AppError("Customer not found", StatusCodes.NOT_FOUND);

  if (customer.accurateCustomerId) {
    return { alreadySynced: true, accurateCustomerId: customer.accurateCustomerId };
  }

  const payload = mapCustomerToAccurate(customer);
  console.log("ACCURATE CUSTOMER PAYLOAD", payload);

  let response;
  try {
    response = await accurateRequest(ACCURATE_CUSTOMER_SAVE, {
      method: "POST",
      body: payload,
    });
    console.log("ACCURATE CUSTOMER RESPONSE", response);
  } catch (err) {
    console.error("ACCURATE CUSTOMER PUSH FAILED", err);
    throw err;
  }

  if (!response.s) {
    const errMsg =
      typeof response.d === "string"
        ? response.d
        : response.message || "Accurate API rejected customer push";
    console.error("ACCURATE CUSTOMER PUSH FAILED", { s: response.s, errMsg, full: response });
    throw new AppError(errMsg, StatusCodes.BAD_GATEWAY);
  }

  const accurateId = response.r?.id;
  const accurateCustomerNo = response.r?.customerNo;
  if (!accurateId) {
    console.error("ACCURATE CUSTOMER PUSH FAILED", { reason: "no ID in response.r", response });
    throw new AppError("Accurate did not return customer ID", StatusCodes.BAD_GATEWAY);
  }

  await updateAfterPush(customerId, {
    accurateCustomerId: parseInt(accurateId, 10),
    customerNo: accurateCustomerNo || null,
  });

  return { alreadySynced: false, accurateCustomerId: parseInt(accurateId, 10), customerNo: accurateCustomerNo };
};

module.exports = { pushCustomerToAccurate };
