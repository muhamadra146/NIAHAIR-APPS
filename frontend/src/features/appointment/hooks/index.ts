import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  fetchAppointments,
  fetchAppointment,
  createAppointment,
  updateAppointment,
  changeAppointmentStatus,
  rescheduleAppointment,
  deleteAppointment,
} from "../api/appointment.api";
import type {
  AppointmentListParams,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeStatusInput,
  RescheduleInput,
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
    staleTime: 0,
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
      qc.setQueryData(["appointments", id], data);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};

export const useChangeAppointmentStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeStatusInput) => changeAppointmentStatus(id, input),
    onSuccess:  (data) => {
      qc.setQueryData(["appointments", id], data);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};

export const useRescheduleAppointment = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RescheduleInput) => rescheduleAppointment(id, input),
    onSuccess:  (data) => {
      qc.setQueryData(["appointments", id], data);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};

export const useDeleteAppointment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["appointments"] }); },
    onError:    (err: Error) => toast.error(err.message),
  });
};
