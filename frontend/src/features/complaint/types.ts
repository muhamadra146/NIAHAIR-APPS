export type ComplaintStatus   = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ComplaintCategory = "HASIL_LAYANAN" | "SIKAP_KARYAWAN" | "WAKTU_TUNGGU" | "HARGA" | "FASILITAS" | "PRODUK" | "LAINNYA";
export type ComplaintSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface ComplaintAppointment {
  id:        string;
  bookingNo: string;
  visitDate: string;
  customer:  { id: string; name: string; mobilePhone: string | null };
  staffs:    { employee: { id: string; name: string; employeeCode: string } }[];
}

export interface Complaint {
  id:          string;
  complaintNo: string;
  branchId:    string;
  branch:      { id: string; name: string };
  appointmentId: string;
  appointment:   ComplaintAppointment;
  invoiceId:    string | null;
  invoice:      { id: string; invoiceNo: string; grandTotal: string } | null;
  employeeId:   string | null;
  employee:     { id: string; name: string; employeeCode: string } | null;
  category:     ComplaintCategory;
  severity:     ComplaintSeverity;
  description:  string;
  status:       ComplaintStatus;
  handledBy:    string | null;
  // Follow up & komunikasi
  followUpDate: string | null;
  chatNotes:    string | null;
  // Resolusi
  resolutionNotes: string | null;
  followUpAction:  string | null;
  resolvedAt:      string | null;
  // Perbaikan
  repairDate:      string | null;
  repairNotes:     string | null;
  repairStaff:     string | null;
  repairAssistant: string | null;
  // Komisi
  correctedStrands:          number | null;
  totalStrands:              number | null;
  commissionId:              string | null;
  commissionDeductionAmount: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintInput {
  appointmentId: string;
  branchId?:     string;
  invoiceId?:    string;
  employeeId?:   string;
  category:      ComplaintCategory;
  severity?:     ComplaintSeverity;
  description:   string;
  // Follow up & komunikasi
  followUpDate?: string;
  chatNotes?:    string;
  // Perbaikan (bisa diisi langsung jika sudah ada tindakan)
  repairDate?:      string;
  repairNotes?:     string;
  repairStaff?:     string;
  repairAssistant?: string;
}

export interface UpdateComplaintInput {
  status?:          ComplaintStatus;
  handledBy?:       string;
  // Follow up & komunikasi
  followUpDate?:    string;   // ISO date string YYYY-MM-DD
  chatNotes?:       string;
  // Resolusi
  resolutionNotes?: string;
  followUpAction?:  string;
  // Perbaikan
  repairDate?:      string;   // ISO date string YYYY-MM-DD
  repairNotes?:     string;
  repairStaff?:     string;
  repairAssistant?: string;
  // Komisi
  correctedStrands?: number;
  totalStrands?:     number;
  commissionId?:     string;
}

export interface ComplaintStats {
  total:      number;
  byStatus:   { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number };
  bySeverity: Partial<Record<ComplaintSeverity, number>>;
  byCategory: { category: ComplaintCategory; count: number }[];
  thisMonth:  number;
  lastMonth:  number;
  resolveRate:    number;
  avgResolveDays: number | null;
}

export interface ComplaintListParams {
  page?:       number;
  limit?:      number;
  branchId?:   string;
  status?:     ComplaintStatus | "";
  employeeId?: string;
  severity?:   ComplaintSeverity | "";
}
