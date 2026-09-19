export type ScheduleStatus = "WORKING" | "OFF" | "LEAVE";

export interface Shift {
  id:        string;
  code:      string;
  name:      string;
  startTime: string | null;
  endTime:   string | null;
  color:     string | null;
  isWorking: boolean;
  isActive:  boolean;
  isUsed:    boolean;
}

export interface ScheduleCell {
  date:       string;
  scheduleId: string | null;
  status:     ScheduleStatus | null;
  shift:      Shift | null;
  notes:      string | null;
}

export interface RosterEmployee {
  id:           string;
  name:         string;
  employeeCode: string;
  role:         { id: string; code: string; name: string };
}

export interface RosterRow {
  employee:  RosterEmployee;
  schedules: ScheduleCell[];
}

export interface RosterData {
  dates: string[];
  rows:  RosterRow[];
}

export interface BulkScheduleItem {
  employeeId: string;
  date:       string;
  shiftId:    string | null;
  status:     ScheduleStatus | null;
  notes?:     string | null;
}

export interface BulkScheduleInput {
  branchId:  string;
  schedules: BulkScheduleItem[];
}

export type ViewMode = "week" | "month";

// ── My Schedule (self-service view) ──────────────────────────────────────────

export interface MyScheduleAttendance {
  id:         string;
  checkIn:    string | null;
  checkOut:   string | null;
  status:     string | null;
}

export interface MyScheduleItem {
  id:         string;
  workDate:   string;             // ISO datetime string
  status:     ScheduleStatus;
  notes:      string | null;
  shift:      {
    id:        string;
    name:      string;
    startTime: string | null;
    endTime:   string | null;
  } | null;
  attendance: MyScheduleAttendance | null;
}
