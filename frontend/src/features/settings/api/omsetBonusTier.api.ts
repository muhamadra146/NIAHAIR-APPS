import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { OmsetBonusTier, CreateOmsetBonusTierInput, UpdateOmsetBonusTierInput } from "../types";

export const fetchOmsetBonusTiers = async (employeeId: string): Promise<OmsetBonusTier[]> => {
  const { data } = await api.get<ApiResponse<OmsetBonusTier[]>>(`/employees/${employeeId}/omset-bonus-tiers`);
  return data.data;
};

export const createOmsetBonusTier = async (
  employeeId: string,
  body: CreateOmsetBonusTierInput,
): Promise<OmsetBonusTier> => {
  const { data } = await api.post<ApiResponse<OmsetBonusTier>>(
    `/employees/${employeeId}/omset-bonus-tiers`,
    body,
  );
  return data.data;
};

export const updateOmsetBonusTier = async (
  id: string,
  body: UpdateOmsetBonusTierInput,
): Promise<OmsetBonusTier> => {
  const { data } = await api.put<ApiResponse<OmsetBonusTier>>(`/omset-bonus-tiers/${id}`, body);
  return data.data;
};

export const deleteOmsetBonusTier = async (id: string): Promise<void> => {
  await api.delete(`/omset-bonus-tiers/${id}`);
};
