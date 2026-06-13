export type ScheduleType    = "WORK" | "OFF" | "LEAVE";
export type ScheduleStatus  = "WORKING" | "OFF" | "LEAVE";
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "HALF_DAY" | "EARLY_LEAVE";

export interface EmployeeSchedule {
  id:           string;
  employeeId:   string;
  scheduleDate: string;
  startTime:    string | null;
  endTime:      string | null;
  scheduleType: ScheduleType;
  notes:        string | null;
  createdAt:    string;
  updatedAt:    string;
  employee: {
    id:           string;
    name:         string;
    employeeCode: string;
    role:         { id: string; code: string; name: string };
    employeeBranches?: Array<{
      branch: { id: string; code: string; name: string };
    }>;
  };
}

export interface AttendanceRecord {
  id:                   string;
  staffScheduleId:      string;
  employeeId:           string;
  branchId:             string;
  workDate:             string;
  checkInAt:            string | null;
  checkOutAt:           string | null;
  checkInLatitude:      number | null;
  checkInLongitude:     number | null;
  checkOutLatitude:     number | null;
  checkOutLongitude:    number | null;
  checkInPhotoUrl:      string | null;
  checkOutPhotoUrl:     string | null;
  status:               AttendanceStatus;
  lateMinutes:          number;
  earlyLeaveMinutes:    number;
  overtimeMinutes:      number;
  isHolidayWork:        boolean;
  notes:                string | null;
  createdAt:            string;
  updatedAt:            string;
  employee: {
    id:           string;
    name:         string;
    employeeCode: string;
    role:         { id: string; code: string; name: string };
  };
  branch: { id: string; code: string; name: string };
}

// Roster row returned by GET /attendance/roster
export interface RosterAttendanceRow {
  scheduleId: string;
  employee: {
    id:           string;
    name:         string;
    employeeCode: string | null;
    role:         { id: string; code: string; name: string };
  };
  shift: {
    id:        string;
    code:      string;
    name:      string;
    startTime: string | null;
    endTime:   string | null;
    color:     string | null;
  } | null;
  status:     ScheduleStatus;
  attendance: AttendanceRecord | null;
}

export interface AvailableStaff {
  employeeId: string;
  name:       string;
  role:       { id: string; code: string; name: string };
  startTime:  string | null;
  endTime:    string | null;
}

export interface AttendanceListParams {
  page?:       number;
  limit?:      number;
  date?:       string;
  branchId?:   string;
  employeeId?: string;
}

export interface CheckInInput {
  staffScheduleId: string;
  latitude?:       number;
  longitude?:      number;
  photoUrl?:       string;
  notes?:          string;
}

export interface ManualSetInput {
  staffScheduleId: string;
  status?:         AttendanceStatus;
  checkInAt?:      string;
  checkOutAt?:     string;
  notes?:          string;
}

// Legacy schedule types (kept for schedule.api.ts compatibility)
export interface ScheduleListParams {
  page?:       number;
  limit?:      number;
  date?:       string;
  branchId?:   string;
  employeeId?: string;
}

export interface CreateScheduleInput {
  employeeId:   string;
  scheduleDate: string;
  scheduleType: ScheduleType;
  startTime?:   string;
  endTime?:     string;
  notes?:       string;
}

export interface UpdateScheduleInput {
  scheduleType?: ScheduleType;
  startTime?:    string;
  endTime?:      string;
  notes?:        string;
}
