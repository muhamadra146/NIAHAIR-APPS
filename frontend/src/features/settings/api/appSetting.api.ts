import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface AppSetting {
  key:   string;
  value: string | null;
}

export const fetchAppSetting = async (key: string): Promise<AppSetting> => {
  const { data } = await api.get<ApiResponse<AppSetting>>(`/app-settings/${key}`);
  return data.data;
};

export const updateAppSetting = async (key: string, value: string): Promise<AppSetting> => {
  const { data } = await api.put<ApiResponse<AppSetting>>(`/app-settings/${key}`, { value });
  return data.data;
};
