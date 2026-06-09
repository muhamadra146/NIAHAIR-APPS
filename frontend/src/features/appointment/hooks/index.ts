import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAppointments,
  fetchAppointment,
  createAppointment,
  updateAppointment,
  changeAppointmentStatus,
} from "../api/appointment.api";
import type {
  AppointmentListParams,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeStatusInput,
} from "../types";

export const useAppointments = (params: AppointmentListParams) =>
  useQuery({
    queryKey: ["appointments", params],
    queryFn:  () => fetchAppointments(params),
  });

export const useAppointment = (id: string) =>
  useQuery({
    queryKey: ["appointments", id],
    queryFn:  () => fetchAppointment(id),
    enabled:  Boolean(id),
  });

export const useCreateAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });
};

export const useUpdateAppointment = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAppointmentInput) => updateAppointment(id, input),
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.setQueryData(["appointments", id], data);
    },
  });
};

export const useChangeAppointmentStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeStatusInput) => changeAppointmentStatus(id, input),
    onSuccess:  (data) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.setQueryData(["appointments", id], data);
    },
  });
};
