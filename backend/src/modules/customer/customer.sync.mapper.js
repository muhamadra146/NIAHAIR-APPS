/**
 * Maps an Accurate customer object to local DB shape.
 * Only maps fields that exist in both systems.
 * Fields absent in Accurate are left null.
 * isActive: Accurate uses `suspended` — true means inactive, false means active.
 */
const mapAccurateToCustomer = (item) => ({
  // parseInt ensures the value is always a plain integer, never a float or string.
  // Accurate returns numeric IDs; any type drift causes findUnique mismatches.
  accurateCustomerId: parseInt(item.id, 10),
  name:        item.name        || "Unknown",
  // Accurate primary field is `no`; fall back to `customerNo` for safety.
  customerNo:  item.no          ?? item.customerNo ?? null,
  email:       item.email       || null,
  mobilePhone: item.mobilePhone || null,
  // Accurate uses bill* prefix for address fields in detail responses.
  address:     item.billStreet  || null,
  city:        item.billCity    || null,
  province:    item.billProvince || null,
  notes:       item.notes       || null,
  isActive:    !item.suspended,
  // Sync tracking — used by CREATE path directly; UPDATE path excludes syncSource.
  syncSource:  "ACCURATE",
  syncStatus:  "SYNCED",
  syncError:   null,
  lastSyncAt:  new Date(),
});

module.exports = { mapAccurateToCustomer };
