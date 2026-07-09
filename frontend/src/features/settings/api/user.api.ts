import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { User, UserListParams, CreateUserInput, UpdateUserInput, ResetPasswordInput } from "../types";

export const fetchUsers = async (params: UserListParams = {}): Promise<PaginatedResponse<User>> => {
  const { data } = await api.get<ApiResponse<PaginatedResponse<User>>>("/users", { params });
  return data.data;
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const { data } = await api.post<ApiResponse<User>>("/users", input);
  return data.data;
};

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, input);
  return data.data;
};

export const resetUserPassword = async (id: string, input: ResetPasswordInput): Promise<void> => {
  await api.patch(`/users/${id}/password`, input);
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};
