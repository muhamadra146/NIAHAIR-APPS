/**
 * Maps an Accurate branch object to local DB shape.
 * Only maps fields that exist in both systems.
 * isActive: Accurate uses `suspended` — true means inactive, false means active.
 */
const mapAccurateToBranch = (item) => ({
  // parseInt ensures the value is always a plain integer, never a float or string.
  // Accurate returns numeric IDs; any type drift causes findUnique mismatches.
  accurateBranchId: parseInt(item.id, 10),
  name: item.name || "Unknown",
  code: item.code || item.branchCode || `ACC-${item.id}`,
  isActive: !item.suspended,
  lastSyncAt: new Date(),
});

module.exports = { mapAccurateToBranch };
