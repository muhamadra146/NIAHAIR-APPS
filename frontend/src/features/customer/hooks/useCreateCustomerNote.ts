import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerNote } from "../api/customerNote.api";

export function useCreateCustomerNote(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => createCustomerNote(customerId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-notes", customerId] });
    },
  });
}
