import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Shift } from "../types";

export const fetchShifts = async (params?: { isActive?: boolean }): Promise<Shift[]> => {
  const { data } = await api.get<ApiResponse<Shift[]>>("/shifts", { params });
  return data.data;
};

export const createShift = async (input: {
  code: string; name: string; startTime?: string; endTime?: string;
  color?: string; isWorking?: boolean;
}): Promise<Shift> => {
  const { data } = await api.post<ApiResponse<Shift>>("/shifts", input);
  return data.data;
};

export const updateShift = async (id: string, input: Partial<{
  code: string; name: string; startTime: string | null; endTime: string | null;
  color: string | null; isWorking: boolean; isActive: boolean;
}>): Promise<Shift> => {
  const { data } = await api.put<ApiResponse<Shift>>(`/shifts/${id}`, input);
  return data.data;
};
