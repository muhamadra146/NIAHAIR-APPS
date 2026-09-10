import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { PayrollGlAccount, SavePayrollGlAccountsInput } from "../types";

export const fetchPayrollGlAccounts = async (): Promise<PayrollGlAccount[]> => {
  const { data } = await api.get<ApiResponse<PayrollGlAccount[]>>("/payroll-gl-accounts");
  return data.data;
};

export const savePayrollGlAccounts = async (
  input: SavePayrollGlAccountsInput,
): Promise<PayrollGlAccount[]> => {
  const { data } = await api.put<ApiResponse<PayrollGlAccount[]>>("/payroll-gl-accounts", input);
  return data.data;
};
