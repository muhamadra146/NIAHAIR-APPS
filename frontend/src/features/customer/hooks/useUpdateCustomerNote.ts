import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomerNote } from "../api/customerNote.api";
import { toast } from "@/lib/toast";

export function useUpdateCustomerNote(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, note }: { noteId: string; note: string }) =>
      updateCustomerNote(customerId, noteId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-notes", customerId] });
      toast.success("Catatan berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui catatan");
    },
  });
}
