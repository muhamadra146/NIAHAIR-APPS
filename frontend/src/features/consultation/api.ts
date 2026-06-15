import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type {
  ConsultationNote,
  ConsultationNoteListParams,
  CreateConsultationNoteInput,
  UpdateConsultationNoteInput,
  ConsultationStats,
} from "./types";

interface NoteListData {
  data: ConsultationNote[];
  meta: PaginatedResponse<ConsultationNote>["meta"];
}

export async function fetchConsultationNotes(params: ConsultationNoteListParams = {}): Promise<NoteListData> {
  const { data } = await api.get<ApiResponse<NoteListData>>("/consultation-notes", { params });
  return data.data;
}

export async function fetchConsultationNote(id: string): Promise<ConsultationNote> {
  const { data } = await api.get<ApiResponse<ConsultationNote>>(`/consultation-notes/${id}`);
  return data.data;
}

export async function fetchConsultationNoteByInvoice(invoiceId: string): Promise<ConsultationNote | null> {
  const { data } = await api.get<ApiResponse<ConsultationNote | null>>(`/consultation-notes/invoice/${invoiceId}`);
  return data.data;
}

export async function createConsultationNote(input: CreateConsultationNoteInput): Promise<ConsultationNote> {
  const { data } = await api.post<ApiResponse<ConsultationNote>>("/consultation-notes", input);
  return data.data;
}

export async function updateConsultationNote(id: string, input: UpdateConsultationNoteInput): Promise<ConsultationNote> {
  const { data } = await api.patch<ApiResponse<ConsultationNote>>(`/consultation-notes/${id}`, input);
  return data.data;
}

export async function deleteConsultationNote(id: string): Promise<void> {
  await api.delete(`/consultation-notes/${id}`);
}

export async function fetchConsultationStats(params: { branchId?: string; startDate?: string; endDate?: string } = {}): Promise<ConsultationStats> {
  const { data } = await api.get<ApiResponse<ConsultationStats>>("/consultation-notes/stats", { params });
  return data.data;
}
