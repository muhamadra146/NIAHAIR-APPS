import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  Appointment,
  AppointmentListParams,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeStatusInput,
} from "../types";

export interface ServiceItem {
  id:       string;
  name:     string;
  itemCode: string;
  itemType: string;
}

interface ServiceItemListData {
  data: ServiceItem[];
  meta: PaginatedResponse<ServiceItem>["meta"];
}

export const fetchServiceItems = async (search: string) => {
  const res = await api.get<ApiResponse<ServiceItemListData>>("/items", {
    params: { itemType: "SERVICE", search: search || undefined, limit: 10, page: 1 },
  });
  return res.data.data.data ?? [];
};

interface AppointmentListData {
  appointments: Appointment[];
  meta:         PaginatedResponse<Appointment>["meta"];
}

export const fetchAppointments = async (params: AppointmentListParams) => {
  const res = await api.get<ApiResponse<AppointmentListData>>("/appointments", {
    params: {
      page:       params.page       ?? 1,
      limit:      params.limit      ?? 20,
      branchId:   params.branchId   || undefined,
      status:     params.status     || undefined,
      customerId: params.customerId || undefined,
      startDate:  params.startDate  || undefined,
      endDate:    params.endDate    || undefined,
    },
  });
  return res.data.data;
};

export const fetchAppointment = async (id: string) => {
  const res = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
  return res.data.data;
};

export const createAppointment = async (body: CreateAppointmentInput) => {
  const res = await api.post<ApiResponse<Appointment>>("/appointments", body);
  return res.data.data;
};

export const updateAppointment = async (id: string, body: UpdateAppointmentInput) => {
  const res = await api.patch<ApiResponse<Appointment>>(`/appointments/${id}`, body);
  return res.data.data;
};

export const changeAppointmentStatus = async (id: string, body: ChangeStatusInput) => {
  const res = await api.patch<ApiResponse<Appointment>>(`/appointments/${id}/status`, body);
  return res.data.data;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  await api.delete(`/appointments/${id}`);
};

// ── Appointment Photos ────────────────────────────────────────────────

export type AppointmentPhotoType = "REFERENCE" | "HAIR_CURRENT";

export interface AppointmentPhoto {
  id:            string;
  appointmentId: string;
  url:           string;
  publicId:      string;
  type:          AppointmentPhotoType;
  notes:         string | null;
  createdAt:     string;
}

export const fetchAppointmentPhotos = async (appointmentId: string): Promise<AppointmentPhoto[]> => {
  const res = await api.get<ApiResponse<AppointmentPhoto[]>>(`/appointments/${appointmentId}/photos`);
  return res.data.data;
};

export const uploadAppointmentPhoto = async (
  appointmentId: string,
  file: File,
  type: AppointmentPhotoType,
  notes?: string,
): Promise<AppointmentPhoto> => {
  const form = new FormData();
  form.append("photo", file);
  form.append("type", type);
  if (notes) form.append("notes", notes);
  const res = await api.post<ApiResponse<AppointmentPhoto>>(
    `/appointments/${appointmentId}/photos`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data.data;
};

export const deleteAppointmentPhoto = async (appointmentId: string, photoId: string): Promise<void> => {
  await api.delete(`/appointments/${appointmentId}/photos/${photoId}`);
};
