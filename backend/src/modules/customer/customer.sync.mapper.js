/**
 * Maps an Accurate customer object to local DB shape.
 * Only maps fields that exist in both systems.
 * Fields absent in Accurate are left null.
 */
const mapAccurateToCustomer = (item) => ({
  // parseInt ensures the value is always a plain integer, never a float or string.
  // Accurate returns numeric IDs; any type drift causes findUnique mismatches.
  accurateCustomerId: parseInt(item.id, 10),
  name: item.name || "Unknown",
  customerNo: item.no || null,
  email: item.email || null,
  mobilePhone: item.mobilePhone || null,
  whatsapp: item.whatsapp || null,
  address: item.address || null,
  city: item.city || null,
  province: item.province || null,
  lastSyncAt: new Date(),
});

module.exports = { mapAccurateToCustomer };
