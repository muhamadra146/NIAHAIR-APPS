import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { UserRole } from "../types";

export const fetchUserRoles = async (): Promise<UserRole[]> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<UserRole>>>("/user-roles", {
    params: { limit: 100 },
  });
  return data.data.data ?? [];
};
