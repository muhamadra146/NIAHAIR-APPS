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
