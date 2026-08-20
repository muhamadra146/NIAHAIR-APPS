import { useQuery } from "@tanstack/react-query";
import { fetchMembershipOptions } from "../api/customer.api";

export function useMembershipOptions() {
  return useQuery({
    queryKey: ["membership-options"],
    queryFn:  fetchMembershipOptions,
    staleTime: 5 * 60 * 1000, // 5 menit
  });
}
