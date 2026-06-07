const { StatusCodes }     = require("http-status-codes");
const AppError            = require("../../common/errors/AppError");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapAccurateCashAccount } = require("./cashAccount.sync.mapper");
const { upsertCashAccount }      = require("./cashAccount.sync.repository");

const ACCURATE_GLACCOUNT_LIST = "/glaccount/list.do";
const ACCURATE_FIELDS         = "id,no,name,accountType";
const TARGET_TYPE             = "CASH_BANK";

const syncCashAccountsFromAccurate = async () => {
  console.log("[cashAccount sync] start");

  let synced   = 0;
  let skipped  = 0;
  let page     = 1;
  let pageCount = 1;

  do {
    const res = await accurateRequest(
      `${ACCURATE_GLACCOUNT_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}`
    );

    if (!res.s) {
      throw new AppError(
        `Accurate API error on glaccount list page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount     = res.sp?.pageCount ?? 1;
    const rows    = res.d ?? [];

    console.log(`[cashAccount sync] page=${page}/${pageCount} count=${rows.length}`);

    for (const row of rows) {
      if (row.accountType !== TARGET_TYPE) {
        skipped++;
        continue;
      }

      if (!row.id || !row.no) {
        skipped++;
        continue;
      }

      const data = mapAccurateCashAccount(row);
      await upsertCashAccount(data);
      synced++;

      console.log(`[cashAccount sync] upserted id=${row.id} no=${row.no} name=${row.name}`);
    }

    page++;
  } while (page <= pageCount);

  console.log(`[cashAccount sync] done — synced=${synced} skipped=${skipped}`);

  return { synced, skipped };
};

module.exports = { syncCashAccountsFromAccurate };
