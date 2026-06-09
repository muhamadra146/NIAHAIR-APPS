export type CustomerGender = "MALE" | "FEMALE";
export type CustomerSyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface CustomerMembership {
  id:   string;
  name: string;
}

export interface Customer {
  id:                  string;
  customerNo:          string | null;
  name:                string;
  mobilePhone:         string | null;
  email:               string | null;
  address:             string | null;
  city:                string | null;
  province:            string | null;
  birthDate:           string | null;
  gender:              CustomerGender | null;
  membershipId:        string | null;
  notes:               string | null;
  isActive:            boolean;
  accurateCustomerId:  number | null;
  syncStatus:          CustomerSyncStatus;
  syncError:           string | null;
  lastVisitAt:         string | null;
  lastSyncAt:          string | null;
  createdAt:           string;
  updatedAt:           string;
  membership:          CustomerMembership | null;
}

export interface CustomerListParams {
  page?:       number;
  limit?:      number;
  search?:     string;
  isActive?:   boolean;
  syncStatus?: CustomerSyncStatus;
}

export interface CreateCustomerInput {
  name:        string;
  mobilePhone?: string;
  email?:       string;
  gender?:      CustomerGender;
  birthDate?:   string;
  address?:     string;
  city?:        string;
  province?:    string;
  notes?:       string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput> & { isActive?: boolean };
