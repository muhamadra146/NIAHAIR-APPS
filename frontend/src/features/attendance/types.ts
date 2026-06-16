// ── Permission Request ────────────────────────────────────────────────
export type PermissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PermissionType   = "ABSENCE" | "LATE";

export interface PermissionRequest {
  id:               string;
  employeeId:       string;
  branchId:         string;
  type:             PermissionType;
  date:             string;
  reason:           string;
  notes:            string | null;
  estimatedArrival: string | null;
  status:           PermissionStatus;
  reviewedBy:       string | null;
  reviewedAt:       string | null;
  reviewNote:       string | null;
  createdAt:        string;
  updatedAt:        string;
  employee:   { id: string; name: string; employeeCode: string | null; role: { id: string; name: string } };
  branch:     { id: string; code: string; name: string };
  reviewer:   { id: string; name: string } | null;
}

export interface CreatePermissionInput {
  type?:             PermissionType;
  date:              string;
  reason:            string;
  notes?:            string;
  estimatedArrival?: string;
}

export interface ReviewPermissionInput {
  reviewNote?: string;
}

export interface PermissionListParams {
  page?:       number;
  limit?:      number;
  branchId?:   string;
  employeeId?: string;
  status?:     PermissionStatus | "";
}

// ── Sick Leave ────────────────────────────────────────────────────────
export type SickLeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface SickLeave {
  id:         string;
  employeeId: string;
  branchId:   string;
  startDate:  string;
  endDate:    string;
  totalDays:  number;
  hasLetter:  boolean;
  letterDate: string | null;
  doctorName: string | null;
  diagnosis:  string | null;
  clinicName: string | null;
  status:     SickLeaveStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt:  string;
  updatedAt:  string;
  employee:   { id: string; name: string; employeeCode: string | null; role: { id: string; name: string } };
  branch:     { id: string; code: string; name: string };
  reviewer:   { id: string; name: string } | null;
}

export interface CreateSickLeaveInput {
  startDate:   string;
  endDate:     string;
  hasLetter?:  boolean;
  letterDate?: string;
  doctorName?: string;
  diagnosis?:  string;
  clinicName?: string;
}

export interface ReviewSickLeaveInput {
  reviewNote?: string;
}

export interface SickLeaveListParams {
  page?:       number;
  limit?:      number;
  branchId?:   string;
  employeeId?: string;
  status?:     SickLeaveStatus | "";
}

// ── Correction Request ────────────────────────────────────────────────
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CorrectionEmployee {
  id:           string;
  name:         string;
  employeeCode: string | null;
}

export interface CorrectionRequest {
  id:                 string;
  employeeId:         string;
  branchId:           string;
  staffScheduleId:    string;
  attendanceId:       string | null;
  requestedCheckIn:   string | null;
  requestedCheckOut:  string | null;
  reason:             string;
  status:             CorrectionStatus;
  reviewedBy:         string | null;
  reviewedAt:         string | null;
  reviewNote:         string | null;
  createdAt:          string;
  updatedAt:          string;
  employee:           CorrectionEmployee;
  staffSchedule:      { id: string; workDate: string; shiftStart: string | null; shiftEnd: string | null } | null;
  attendance:         { id: string; checkIn: string | null; checkOut: string | null } | null;
  reviewer:           { id: string; name: string } | null;
}

export interface CreateCorrectionInput {
  staffScheduleId:   string;
  attendanceId?:     string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason:            string;
}

export interface ReviewCorrectionInput {
  status:     "APPROVED" | "REJECTED";
  reviewNote?: string;
}

export interface CorrectionListParams {
  page?:       number;
  limit?:      number;
  branchId?:   string;
  status?:     CorrectionStatus | "";
  employeeId?: string;
}
