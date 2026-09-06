import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchMemberships, createMembership, updateMembership, deleteMembership,
} from "./api";
import type { CreateMembershipInput, UpdateMembershipInput } from "./types";

export function useMemberships(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey:  ["memberships", params],
    queryFn:   () => fetchMemberships(params),
    staleTime: 30 * 1000,
  });
}

export function useCreateMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMembershipInput) => createMembership(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membership berhasil dibuat");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMembershipInput }) =>
      updateMembership(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membership berhasil diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMembership(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membership berhasil dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
