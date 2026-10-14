import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface Division {
  id:        string;
  code:      string;
  name:      string;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
  _count?:   { employees: number };
}

export interface DivisionInput {
  code?:     string;
  name?:     string;
  isActive?: boolean;
}

export async function fetchDivisions(includeInactive = false): Promise<Division[]> {
  const { data } = await api.get<ApiResponse<Division[]>>("/divisions", { params: includeInactive ? { includeInactive: true } : {} });
  return data.data;
}

export async function createDivision(input: Required<Pick<DivisionInput, "code" | "name">> & DivisionInput): Promise<Division> {
  const { data } = await api.post<ApiResponse<Division>>("/divisions", input);
  return data.data;
}

export async function updateDivision(id: string, input: DivisionInput): Promise<Division> {
  const { data } = await api.put<ApiResponse<Division>>(`/divisions/${id}`, input);
  return data.data;
}
