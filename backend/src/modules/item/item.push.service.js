const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { findById } = require("./item.repository");
const { mapItemToAccurate } = require("./item.push.mapper");
const { updateAfterPush } = require("./item.push.repository");

const ACCURATE_ITEM_SAVE = "/item/save.do";

// TODO: move to background sync job
const pushItemToAccurate = async (itemId) => {
  const item = await findById(itemId);
  if (!item) throw new AppError("Item not found", StatusCodes.NOT_FOUND);

  console.log("START PUSH ITEM TO ACCURATE", item.id);

  if (item.accurateItemId) {
    return { alreadySynced: true, accurateItemId: item.accurateItemId };
  }

  const payload = mapItemToAccurate(item);
  console.log("ACCURATE ITEM PAYLOAD", payload);

  let response;
  try {
    response = await accurateRequest(ACCURATE_ITEM_SAVE, {
      method: "POST",
      body: payload,
    });
    console.log("ACCURATE ITEM RESPONSE", response);
  } catch (err) {
    console.error("ACCURATE ITEM PUSH FAILED", { error: err, response });
    throw err;
  }

  if (!response.s) {
    const errMsg =
      typeof response.d === "string"
        ? response.d
        : response.message || "Accurate API rejected item push";
    console.error("ACCURATE ITEM PUSH FAILED", { s: response.s, errMsg, full: response });
    throw new AppError(errMsg, StatusCodes.BAD_GATEWAY);
  }

  const accurateId = response.r?.id;
  const accurateItemNo = response.r?.no;
  if (!accurateId) {
    console.error("ACCURATE ITEM PUSH FAILED", { reason: "no ID in response.r", response });
    throw new AppError("Accurate did not return item ID", StatusCodes.BAD_GATEWAY);
  }

  await updateAfterPush(itemId, {
    accurateItemId: parseInt(accurateId, 10),
    itemCode: accurateItemNo || null,
  });

  return { alreadySynced: false, accurateItemId: parseInt(accurateId, 10), itemCode: accurateItemNo };
};

module.exports = { pushItemToAccurate };
