const { findByUsage } = require("../glAccount/glAccount.sync.repository");
const { upsertCashAccount, findAllActiveAccurateIds, deactivateManyByIds } = require("./cashAccount.sync.repository");

const CASH_ACCOUNT_USAGE = "CASH_ACCOUNT";

const syncCashAccountsFromAccurate = async () => {
  console.log("[cashAccount sync] reading from gl_accounts where usage=CASH_ACCOUNT");

  const glAccounts = await findByUsage(CASH_ACCOUNT_USAGE);

  if (glAccounts.length === 0) {
    console.log("[cashAccount sync] no CASH_ACCOUNT accounts found");
    return { synced: 0, skipped: 0, deactivated: 0, message: "Tidak ada akun dengan penggunaan 'Cash Account'. Tag akun di Settings → GL Akun terlebih dahulu." };
  }

  let synced  = 0;
  let skipped = 0;

  const syncedAccurateIds = new Set();

  for (const gl of glAccounts) {
    if (!gl.accurateGlAccountId || !gl.number) { skipped++; continue; }

    await upsertCashAccount({
      accurateAccountId: gl.accurateGlAccountId,
      accurateAccountNo: String(gl.number),
      code:              String(gl.number),
      name:              gl.name,
    });

    syncedAccurateIds.add(gl.accurateGlAccountId);
    synced++;
    console.log(`[cashAccount sync] upserted no=${gl.number} name=${gl.name}`);
  }

  // Auto-deactivate accounts that are no longer tagged
  const existing = await findAllActiveAccurateIds();
  const toDeactivate = existing
    .filter((a) => !syncedAccurateIds.has(a.accurateAccountId))
    .map((a) => a.id);

  let deactivated = 0;
  if (toDeactivate.length > 0) {
    await deactivateManyByIds(toDeactivate);
    deactivated = toDeactivate.length;
    console.log(`[cashAccount sync] deactivated=${deactivated} untagged accounts`);
  }

  console.log(`[cashAccount sync] done — synced=${synced} skipped=${skipped} deactivated=${deactivated}`);
  return { synced, skipped, deactivated };
};

module.exports = { syncCashAccountsFromAccurate };
