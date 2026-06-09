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
  const navigate              = useNavigate();
  const { login, setBranch }  = useAuthStore();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: ({ token, user }) => {
      login(token, user);
      if (user.branches.length === 1) {
        setBranch(user.branches[0].id);
        navigate("/dashboard", { replace: true });
      } else if (user.branches.length > 1) {
        navigate("/branch-select", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    },
  });
}
