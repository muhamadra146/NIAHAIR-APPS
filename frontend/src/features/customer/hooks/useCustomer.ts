import { useQuery } from "@tanstack/react-query";
import { fetchCustomer } from "../api/customer.api";

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn:  () => fetchCustomer(id),
    enabled:  Boolean(id),
  });
}
