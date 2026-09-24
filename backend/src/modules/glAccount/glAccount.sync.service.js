const logger = require('../../utils/logger');
const { StatusCodes } = require("http-status-codes");
const AppError = require("../../common/errors/AppError");
const { paginate, paginationMeta } = require("../../utils/pagination");
const { accurateRequest } = require("../accurate/accurate.client");
const { mapAccurateToGlAccount } = require("./glAccount.sync.mapper");
const { findById, findByAccurateId, createFromAccurate, updateByAccurateId, findAllActive, countActive, updateUsage } = require("./glAccount.sync.repository");
const { findByAccurateAccountId, update: updateCashAccount } = require("../cashAccount/cashAccount.repository");

const CASH_ACCOUNT_USAGE = "CASH_ACCOUNT";

const ACCURATE_GLACCOUNT_LIST = "/glaccount/list.do";
const ACCURATE_FIELDS = "id,no,name,suspended,accountType";

const syncGlAccountsFromAccurate = async ({ accurateBranchId } = {}) => {
  let page      = 1;
  let pageCount = 1;
  let created   = 0;
  let updated   = 0;
  let failed    = 0;
  const processedIds = new Set();
  const branchFilter = accurateBranchId ? `&branchId=${accurateBranchId}` : "";

  do {
    const response = await accurateRequest(
      `${ACCURATE_GLACCOUNT_LIST}?fields=${ACCURATE_FIELDS}&sp.page=${page}${branchFilter}`
    );

    if (!response.s) {
      throw new AppError(
        `Accurate API error on GL accounts page ${page}`,
        StatusCodes.BAD_GATEWAY
      );
    }

    pageCount = response.sp?.pageCount ?? 1;
    const accounts = response.d ?? [];
    logger.info(`[gl-account sync] page ${page}/${pageCount} — ${accounts.length} records`);

    for (const item of accounts) {
      if (!item.id) { failed++; continue; }
      const accurateId = parseInt(item.id, 10);
      if (processedIds.has(accurateId)) continue;
      processedIds.add(accurateId);

      try {
        const mapped   = mapAccurateToGlAccount(item);
        const existing = await findByAccurateId(accurateId);
        if (existing) {
          const { accurateGlAccountId, ...updateData } = mapped;
          await updateByAccurateId(accurateId, updateData);
          updated++;
        } else {
          await createFromAccurate(mapped);
          created++;
        }
      } catch (err) {
        logger.error(`[gl-account sync] error id=${item.id}`, err.message);
        failed++;
      }
    }

    page++;
  } while (page <= pageCount);

  logger.info(`[gl-account sync] done — created=${created} updated=${updated} failed=${failed}`);
  return { created, updated, failed, synced: created + updated };
};

const getGlAccounts = async ({ category, usage, page, limit } = {}) => {
  const { skip, take, page: pageNum, limit: limitNum } = paginate(page, limit);
  const [data, total] = await Promise.all([
    findAllActive({ category, usage, skip, take }),
    countActive({ category, usage }),
  ]);
  return { data, meta: paginationMeta(total, pageNum, limitNum) };
};

const updateGlAccountUsage = async (id, newUsage) => {
  const glAccount = await findById(id);
  if (!glAccount) throw new AppError("GL Account not found", StatusCodes.NOT_FOUND);

  const oldUsage = glAccount.usage;

  if (oldUsage === CASH_ACCOUNT_USAGE && newUsage !== CASH_ACCOUNT_USAGE) {
    if (glAccount.accurateGlAccountId) {
      const cashAccount = await findByAccurateAccountId(glAccount.accurateGlAccountId);
      if (cashAccount) {
        if (cashAccount.paymentMethods && cashAccount.paymentMethods.length > 0) {
          const names = cashAccount.paymentMethods.map((m) => m.name).join(", ");
          throw new AppError(
            `Tidak dapat mengubah penggunaan — Cash Account "${cashAccount.name}" masih dipakai oleh metode pembayaran: ${names}`,
            StatusCodes.CONFLICT
          );
        }
        await updateCashAccount(cashAccount.id, { isActive: false });
      }
    }
  }

  return updateUsage(id, newUsage ?? null);
};

module.exports = { syncGlAccountsFromAccurate, getGlAccounts, updateGlAccountUsage };
