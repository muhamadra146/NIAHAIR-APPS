export type AppointmentStatus =
  | "BOOKED"
  | "CONFIRMED"
  | "CHECK_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentType = "SALON" | "HOME_SERVICE";

export interface AppointmentCustomer {
  id:          string;
  name:        string;
  customerNo:  string | null;
  mobilePhone: string | null;
}

export interface AppointmentBranch {
  id:   string;
  code: string;
  name: string;
}

export interface AppointmentEmployee {
  id:           string;
  employeeCode: string;
  name:         string;
  role?:        { id: string; code: string; name: string };
}

export interface AppointmentServiceItem {
  id:       string;
  name:     string;
  itemCode: string;
}

export interface AppointmentService {
  id:          string;
  serviceItem: AppointmentServiceItem;
}

export interface AppointmentStaff {
  id:       string;
  employee: AppointmentEmployee;
}

export interface AppointmentStatusHistory {
  id:            string;
  appointmentId: string;
  oldStatus:     AppointmentStatus | null;
  newStatus:     AppointmentStatus;
  notes:         string | null;
  createdBy:     string | null;
  createdAt:     string;
}

export interface TreatmentSessionRef {
  id:          string;
  startedAt:   string | null;
  completedAt: string | null;
  notes:       string | null;
}

export interface Appointment {
  id:                  string;
  customerId:          string;
  branchId:            string;
  bookingNo:           string;
  bookingDate:         string;
  visitDate:           string;
  startTime:           string;
  endTime:             string;
  status:              AppointmentStatus;
  type:                AppointmentType;
  homeServiceAddress:  string | null;
  notes:               string | null;
  estimatedTotal:      string | null;
  createdByEmployeeId: string | null;
  createdAt:           string;
  updatedAt:           string;
  customer:            AppointmentCustomer;
  branch:              AppointmentBranch;
  createdByEmployee:   AppointmentEmployee | null;
  services:            AppointmentService[];
  staffs:              AppointmentStaff[];
  statusHistories:     AppointmentStatusHistory[];
  treatmentSessions:   TreatmentSessionRef[];
  photos?:             { id: string; url: string; type: string; notes: string | null; createdAt: string }[];
}

export interface AppointmentListParams {
  page?:       number;
  limit?:      number;
  branchId?:   string;
  status?:     AppointmentStatus | "";
  customerId?: string;
  startDate?:  string;
  endDate?:    string;
}

export interface ServiceInput {
  itemId: string;
  qty:    number;
  price:  number;
  notes?: string;
}

export interface AvailableStaff {
  employeeId: string;
  name:       string;
  role:       { id: string; code: string; name: string };
  shiftCode:  string | null;
  startTime:  string | null;
  endTime:    string | null;
}

export interface CreateAppointmentInput {
  customerId:         string;
  visitDate:          string;      // YYYY-MM-DD
  startTime:          string;      // HH:MM
  endTime:            string;      // HH:MM
  type?:              AppointmentType;
  homeServiceAddress?: string;
  notes?:             string;
  estimatedTotal?:    number;
  services?:          ServiceInput[];
  staffIds?:          string[];
}

export interface UpdateAppointmentInput {
  visitDate?:          string;
  startTime?:          string;
  endTime?:            string;
  type?:               AppointmentType;
  homeServiceAddress?: string;
  notes?:              string;
  estimatedTotal?:     number;
  staffIds?:           string[];
}

export interface ChangeStatusInput {
  status: AppointmentStatus;
  notes?: string;
}
