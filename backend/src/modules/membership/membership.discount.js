// ── Item yang dapat diskon membership (keputusan user 2026-10-14) ─────────────
// Satu persen/nominal per paket, berlaku hanya untuk item yang:
//   1. bukan bahan baku treatment,
//   2. tidak ditandai "tidak pernah kena diskon member" (items.excludeMemberDiscount),
//   3. kategorinya — atau kategori induknya — dicentang di paket membership.

/** Set categoryId yang dapat diskon pada paket membership */
const discountCategoryIds = (membership) =>
  new Set((membership?.discountCategories ?? []).map((d) => d.categoryId));

/**
 * @param {object}  item        { categoryId, excludeMemberDiscount, category?: { parentId } }
 * @param {object}  membership  { discountCategories: [{ categoryId }] }
 * @param {boolean} isMaterial
 */
const isMemberDiscountEligible = (item, membership, isMaterial = false) => {
  if (isMaterial || !item || !membership || item.excludeMemberDiscount) return false;
  const ids = discountCategoryIds(membership);
  if (item.categoryId && ids.has(item.categoryId)) return true;
  const parentId = item.category?.parentId;
  return !!parentId && ids.has(parentId);
};

// Field item yang dibutuhkan isMemberDiscountEligible — dipakai di select Prisma
const ELIGIBILITY_ITEM_SELECT = {
  categoryId:            true,
  excludeMemberDiscount: true,
  category:              { select: { parentId: true } },
};

const DISCOUNT_CATEGORIES_SELECT = { select: { categoryId: true } };

module.exports = { isMemberDiscountEligible, ELIGIBILITY_ITEM_SELECT, DISCOUNT_CATEGORIES_SELECT };
