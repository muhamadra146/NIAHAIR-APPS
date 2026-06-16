import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCorrections, fetchMyCorrections, createCorrection, reviewCorrection,
} from "../api/correction.api";
import type { CorrectionListParams, CreateCorrectionInput, ReviewCorrectionInput } from "../types";

export const useCorrections = (params: CorrectionListParams = {}) =>
  useQuery({ queryKey: ["corrections", params], queryFn: () => fetchCorrections(params) });

export const useMyCorrections = (params: CorrectionListParams = {}) =>
  useQuery({ queryKey: ["corrections", "my", params], queryFn: () => fetchMyCorrections(params) });

export const useCreateCorrection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCorrectionInput) => createCorrection(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corrections"] });
    },
  });
};

export const useReviewCorrection = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewCorrectionInput) => reviewCorrection(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corrections"] });
    },
  });
};
