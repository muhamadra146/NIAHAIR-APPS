/**
 * Maps a single Accurate GL account row to a local CashAccount upsert payload.
 * Pure function — no DB, no API.
 *
 * Accurate fields used:
 *   id          → accurateAccountId (Int)
 *   no          → accurateAccountNo + code (the GL account number)
 *   name        → name
 *   accountType → filtered upstream — only CASH_BANK rows reach this mapper
 */

const mapAccurateCashAccount = (row) => ({
  accurateAccountId: row.id,
  accurateAccountNo: String(row.no),
  code:              String(row.no),
  name:              row.name,
});

module.exports = { mapAccurateCashAccount };
