import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../api/customer.api";
import type { CreateCustomerInput } from "../types";

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomerInput) => createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
