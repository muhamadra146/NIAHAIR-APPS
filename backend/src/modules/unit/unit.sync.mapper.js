/**
 * Maps an Accurate unit object to local DB shape.
 * isActive: Accurate uses `suspended` — true means inactive, false means active.
 */
const mapAccurateToUnit = (item) => ({
  accurateUnitId: parseInt(item.id, 10),
  name:           item.name || "Unknown",
  isActive:       !item.suspended,
  lastSyncAt:     new Date(),
});

module.exports = { mapAccurateToUnit };
