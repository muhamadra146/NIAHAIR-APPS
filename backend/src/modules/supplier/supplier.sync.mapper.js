'use strict';

const mapAccurateToSupplier = (item) => ({
  accurateVendorId: parseInt(item.id, 10),
  name:         item.name ?? "",
  code:         item.no   ?? item.code ?? null,
  email:        item.email ?? null,
  phone:        item.mobilePhone ?? item.phone ?? null,
  address:      item.address1 ?? item.address ?? null,
  paymentTerms: item.creditTerms?.name ?? null,
  isActive:     item.inactive == null ? true : (item.inactive === false || item.inactive === "false" ? true : !item.inactive),
});

module.exports = { mapAccurateToSupplier };
