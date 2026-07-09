import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCustomerNote } from "../api/customerNote.api";

export function useDeleteCustomerNote(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteCustomerNote(customerId, noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-notes", customerId] });
    },
  });
}
