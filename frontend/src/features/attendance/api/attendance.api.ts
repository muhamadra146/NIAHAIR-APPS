import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface AttendanceToday {
  scheduleId: string;
  status:     string;
  notes:      string | null;
  shift: {
    id:        string;
    code:      string;
    name:      string;
    startTime: string;
    endTime:   string;
    color:     string | null;
  } | null;
  attendance: {
    id:          string;
    checkInAt:   string | null;
    checkOutAt:  string | null;
    status:      string;
    lateMinutes: number | null;
    notes:       string | null;
  } | null;
}

export async function fetchMyAttendanceToday(): Promise<AttendanceToday | null> {
  const { data } = await api.get<ApiResponse<AttendanceToday | null>>("/attendance/my/today");
  return data.data;
}
