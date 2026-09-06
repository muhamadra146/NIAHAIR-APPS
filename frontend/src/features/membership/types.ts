export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface Membership {
  id:            string;
  name:          string;
  price:         number;
  durationDays:  number;
  discountType:  DiscountType;
  discountValue: number;
  createdAt:     string;
  updatedAt:     string;
}

export interface CreateMembershipInput {
  name:          string;
  price:         number;
  durationDays:  number;
  discountType:  DiscountType;
  discountValue: number;
}

export type UpdateMembershipInput = Partial<CreateMembershipInput>;
