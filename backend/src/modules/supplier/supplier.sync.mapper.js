'use strict';

const mapAccurateToSupplier = (item) => ({
  accurateVendorId: parseInt(item.id, 10),
  // Jika name kosong dari Accurate, fallback ke "Vendor #<id>" agar tidak tersimpan sebagai ""
  name:             item.name?.trim() || `Vendor #${item.id}`,
  // Kode vendor: dari detail (vendorNo) disimpan ke item.no, fallback item.code
  code:             item.no   ?? item.code ?? null,
  email:            item.email ?? null,
  // Mobile phone dari mobilePhone (list) atau phone
  phone:            item.mobilePhone ?? item.phone ?? null,
  // Business phone: workPhone dari detail → disimpan ke item.businessNo di sync service
  businessPhone:    item.businessNo ?? item.fax ?? item._businessPhoneFallback ?? null,
  // WhatsApp: belum ada field langsung di Accurate detail, skip untuk sekarang
  whatsapp:         item.whatsApp ?? item.whatsappNo ?? item.whatsapp ?? null,
  // Website: tersedia dari detail
  website:          item.website ?? null,
  // Address: billStreet dari detail → disimpan ke item.address1 di sync service
  address:          item.address1 ?? item.address ?? null,
  // Payment terms: field 'term' dari detail (objek {id, name}) → disimpan ke item.creditTerms
  paymentTerms:     item.creditTerms?.name ?? item.term?.name ?? null,
  // Default purchase discount: defaultPurchaseDisc dari detail → item.purchaseDiscount
  purchaseDiscount: item.purchaseDiscount != null
    ? Number(item.purchaseDiscount)
    : item.defaultPurchaseDisc != null
      ? Number(item.defaultPurchaseDisc)
      : null,
  // isActive: suspended dari detail (suspended=true → non-aktif) → disimpan ke item.inactive
  // item.inactive = d.suspended: false=aktif, true=non-aktif, null=aktif (default)
  isActive:         item.inactive == null
    ? true
    : item.inactive === false || item.inactive === "false"
      ? true
      : !item.inactive,
});

module.exports = { mapAccurateToSupplier };
