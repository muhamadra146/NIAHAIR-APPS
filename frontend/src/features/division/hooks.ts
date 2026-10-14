import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { fetchDivisions, createDivision, updateDivision } from "./api";
import type { DivisionInput } from "./api";

export function useDivisions(includeInactive = false) {
  return useQuery({
    queryKey:  ["divisions", includeInactive],
    queryFn:   () => fetchDivisions(includeInactive),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DivisionInput }) =>
      id ? updateDivision(id, input) : createDivision({ code: input.code ?? "", name: input.name ?? "", ...input }),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["divisions"] });
      toast.success(id ? "Divisi berhasil diperbarui" : "Divisi berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
