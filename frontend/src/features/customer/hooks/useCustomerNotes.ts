import { useQuery } from "@tanstack/react-query";
import { fetchCustomerNotes } from "../api/customerNote.api";

export function useCustomerNotes(customerId: string) {
  return useQuery({
    queryKey: ["customer-notes", customerId],
    queryFn:  () => fetchCustomerNotes(customerId),
    enabled:  !!customerId,
  });
}
