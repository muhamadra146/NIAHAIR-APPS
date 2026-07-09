export type UserRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "FINANCE"
  | "STAFF"
  | "STYLIST";

export interface Branch {
  id:   string;
  code: string;
  name: string;
}

export interface AuthUser {
  id:         string;
  email:      string;
  roleCode:   UserRole;
  employeeId: string | null;

  role: {
    id:   string;
    code: string;
    name: string;
  };

  employee: {
    id:           string;
    name:         string;
    employeeCode: string;
  } | null;

  branches: Branch[];
}

export interface AuthState {
  user:     AuthUser | null;
  token:    string | null;
  branchId: string | null;
}

export interface LoginCredentials {
  identifier: string;
  password:   string;
}

export interface LoginResponse {
  token: string;
  user:  AuthUser;
}
