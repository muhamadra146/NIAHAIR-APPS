export interface ConsultationNote {
  id:                     string;
  invoiceId:              string;
  customerId:             string;
  branchId:               string;
  filledByEmployeeId:     string | null;
  filledAt:               string;
  createdAt:              string;
  updatedAt:              string;

  profession:             string | null;
  professionOther:        string | null;
  ageRange:               string | null;
  dailyStyling:           string[];
  dailyStylingOther:      string | null;

  discoveryChannel:       string | null;
  discoveryChannelDetail: string | null;
  reasonForService:       string[];
  reasonForServiceOther:  string | null;
  hesitation:             string[];
  hesitationOther:        string | null;
  previousExpType:        string | null;
  previousSalonName:      string | null;
  reasonSwitchToNia:      string | null;

  issuesDuringUse:        string | null;
  changesAfterUse:        string | null;
  interestingNote:        string;
  additionalNotes:        string | null;

  customer?:        { id: string; name: string; customerNo: string | null; mobilePhone: string | null };
  branch?:          { id: string; code: string; name: string };
  filledByEmployee?:{ id: string; employeeCode: string; name: string } | null;
  invoice?: {
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    items: Array<{ item: { id: string; name: string; itemType: string } }>;
    treatmentSessions: Array<{
      treatmentItems: Array<{
        assignments: Array<{
          employee: { id: string; name: string; employeeCode: string };
          slotKey: string | null;
        }>;
      }>;
    }>;
  };
}

export interface ConsultationNoteListParams {
  page?:                number;
  limit?:               number;
  customerId?:          string;
  branchId?:            string;
  filledByEmployeeId?:  string;
  startDate?:           string;
  endDate?:             string;
}

export interface CreateConsultationNoteInput {
  invoiceId:              string;
  profession?:            string;
  professionOther?:       string;
  ageRange?:              string;
  dailyStyling?:          string[];
  dailyStylingOther?:     string;
  discoveryChannel?:      string;
  discoveryChannelDetail?:string;
  reasonForService?:      string[];
  reasonForServiceOther?: string;
  hesitation?:            string[];
  hesitationOther?:       string;
  previousExpType?:       string;
  previousSalonName?:     string;
  reasonSwitchToNia?:     string;
  issuesDuringUse?:       string;
  changesAfterUse?:       string;
  interestingNote:        string;
  additionalNotes?:       string;
}

export type UpdateConsultationNoteInput = Omit<CreateConsultationNoteInput, "invoiceId">;

export interface ConsultationStats {
  total:            number;
  profession:       Record<string, number>;
  ageRange:         Record<string, number>;
  dailyStyling:     Record<string, number>;
  discoveryChannel: Record<string, number>;
  reasonForService: Record<string, number>;
  hesitation:       Record<string, number>;
  previousExpType:  Record<string, number>;
}
