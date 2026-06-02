/**
 * Maps an Accurate item object to local DB shape.
 * itemType: anything containing "SERVICE" or "JASA" → SERVICE, else INVENTORY.
 * isActive: Accurate uses `suspended` — true means inactive, false means active.
 */
const mapItemType = (accurateType) => {
  if (!accurateType) return "INVENTORY";
  const t = String(accurateType).toUpperCase();
  if (t.includes("SERVICE") || t.includes("JASA")) return "SERVICE";
  return "INVENTORY";
};

const mapAccurateToItem = (item) => ({
  accurateItemId: parseInt(item.id, 10),
  itemCode: item.no || `ACC-${item.id}`,
  name: item.name || "Unknown",
  itemType: mapItemType(item.itemType),
  isActive: !item.suspended,
  lastSyncAt: new Date(),
});

module.exports = { mapAccurateToItem };
