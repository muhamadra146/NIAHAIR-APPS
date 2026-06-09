import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/stores/authStore";
import type { LoginCredentials, LoginResponse } from "@/types/auth";
import type { ApiResponse } from "@/types/api";

async function loginRequest(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>(
    "/auth/login",
    credentials
  );
  return data.data;
}

export function useLogin() {
  const navigate  = useNavigate();
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: ({ token, user }) => {
      login(token, user);
      navigate("/dashboard", { replace: true });
    },
  });
}
