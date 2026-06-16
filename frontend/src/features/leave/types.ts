export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveEmployee {
  id:           string;
  name:         string;
  employeeCode: string | null;
  role:         { id: string; code: string; name: string };
  homeBranch:   { id: string; code: string; name: string } | null;
}

export interface Leave {
  id:          string;
  employeeId:  string;
  startDate:   string;
  endDate:     string;
  reason:      string | null;
  status:      LeaveStatus;
  totalDays:   number | null;
  leaveTypeId: string | null;
  leaveType:   { id: string; code: string; name: string; isPaid: boolean } | null;
  approvedBy:  string | null;
  approvedAt:  string | null;
  createdAt:   string;
  updatedAt:   string;
  employee:    LeaveEmployee | null;
}

export interface LeaveListParams {
  page?:       number;
  limit?:      number;
  employeeId?: string;
  branchId?:   string;
  status?:     LeaveStatus | "";
}

export interface CreateLeaveInput {
  startDate:   string;
  endDate:     string;
  reason?:     string;
  leaveTypeId?: string;
}
