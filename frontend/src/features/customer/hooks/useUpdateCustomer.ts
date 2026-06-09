import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../api/customer.api";
import type { UpdateCustomerInput } from "../types";

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => updateCustomer(id, input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.setQueryData(["customers", id], updated);
    },
  });
}
