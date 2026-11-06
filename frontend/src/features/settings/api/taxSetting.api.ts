import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { TaxSetting, TaxSettingInput } from "../types";

export const fetchTaxSettings = async (): Promise<TaxSetting[]> => {
  const { data } = await api.get<ApiResponse<TaxSetting[]>>("/tax-settings");
  return data.data;
};

export const createTaxSetting = async (input: TaxSettingInput): Promise<TaxSetting> => {
  const { data } = await api.post<ApiResponse<TaxSetting>>("/tax-settings", input);
  return data.data;
};

export const updateTaxSetting = async (id: string, input: TaxSettingInput): Promise<TaxSetting> => {
  const { data } = await api.put<ApiResponse<TaxSetting>>(`/tax-settings/${id}`, input);
  return data.data;
};
