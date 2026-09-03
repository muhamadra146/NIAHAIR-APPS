import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerNote } from "../api/customerNote.api";
import { toast } from "@/lib/toast";

export function useCreateCustomerNote(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => createCustomerNote(customerId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-notes", customerId] });
      toast.success("Catatan berhasil disimpan");
    },
    onError: () => {
      toast.error("Gagal menyimpan catatan");
    },
  });
}
