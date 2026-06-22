import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Holiday, CreateHolidayInput, UpdateHolidayInput } from "../types";

export const fetchHolidays = async (year?: number): Promise<Holiday[]> => {
  const { data } = await api.get<ApiResponse<Holiday[]>>("/holidays", {
    params: year ? { year } : {},
  });
  return data.data;
};

export const createHoliday = async (input: CreateHolidayInput): Promise<Holiday> => {
  const { data } = await api.post<ApiResponse<Holiday>>("/holidays", input);
  return data.data;
};

export const updateHoliday = async (id: string, input: UpdateHolidayInput): Promise<Holiday> => {
  const { data } = await api.put<ApiResponse<Holiday>>(`/holidays/${id}`, input);
  return data.data;
};

export const deleteHoliday = async (id: string): Promise<void> => {
  await api.delete(`/holidays/${id}`);
};
