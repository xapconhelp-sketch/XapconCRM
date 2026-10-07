export enum ViewType {
  DASHBOARD = "dashboard",
  INSURANCE_CLAIM = "insurance_claim",
  CLAIMS = "claims",
  PRODUCTION = "production",
  INSURANCE_DIRECTORY = "insurance_directory",
  VALORES_INSURANCE = "valores_insurance",
  TEAM = "team",
  SETTINGS = "settings"
}

export interface InsuranceContact {
  email?: string;
  phone?: string;
  department?: string;
  source?: "official" | "detected_from_claim" | "manual";
  notes?: string;
}

export interface InsuranceCompanyStats {
  id: string;
  name: string;
  aliases: string[];
  website?: string;
  portalUrl?: string;
  emails: string[];
  phones: string[];
  totalClaims: number;
  activeClaims: number;
  approvedClaims: number;
  finalizedClaims: number;
  deniedClaims: number;
  inDisputeClaims: number;
  adjusters: string[];
  claims: Lead[];
  customNotes?: string;
}

export interface KPI {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  subtitle: string;
  icon: string;
  theme?: "primary" | "secondary" | "error" | "warning" | "info";
  progress?: number;
}

export interface Lead {
  id: string;
  name: string;
  status: string;
  address?: string;
  phone: string;
  phone2?: string;
  email: string;
  email2?: string;
  propertyType: string;
  sqft: number;
  insuranceProvider: string;
  claimNumber: string;
  policyNumber?: string;
  damageType?: string;
  lossDate?: string;
  insurancePhone1?: string;
  insurancePhone2?: string;
  insuranceEmail1?: string;
  insuranceEmail2?: string;
  notes?: string;
  insuranceNotes?: string;
  adjusterName: string;
  assignedRep: string;
  assignedRepAvatar: string;
  createdAt: string;
  created_at?: string;
  timeline: TimelineEvent[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  company?: string;
  organizationId?: string;
  is_insurance_claim?: boolean;
  estimate?: Estimate;
}

export interface TimelineEvent {
  id: string;
  type: "status_change" | "photo_upload" | "call_log" | "note" | "system";
  author: string;
  authorAvatar?: string;
  title: string;
  content: string;
  timestamp: string;
  date?: string;
  duration?: string;
  photos?: string[];
  mentionedUserIds?: string[];
  fromStatus?: string;
  toStatus?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: string;
  category: "Reporte" | "Contrato" | "Foto" | "Seguro";
  url?: string;
  filePath?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "completed";
  priority?: "high" | "medium" | "low";
  kind?: "task" | "inspection" | "adjuster_meeting" | "installation";
  category?: "general" | "pending_document" | "visit_homeowner" | "call_homeowner" | "call_adjuster";
  scheduledTime?: string;
  assignedTo?: string;
  assignedToId?: string;
  createdAt?: string;
  createdById?: string;
  createdBy?: string;
}



export interface EstimateItem {
  id: string;
  description: string;
  category: "material" | "labor" | "fee";
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  warning?: string;
}

export interface Estimate {
  id: string;
  leadId: string;
  clientName: string;
  address: string;
  clientPhone?: string;
  clientEmail?: string;
  status: "Draft" | "Sent" | "Approved";
  items: EstimateItem[];
  subtotalMaterials: number;
  subtotalLabor: number;
  subtotalFees: number;
  baseFee?: number;
  subtotalGross: number;
  taxRate: number; // e.g., 0.0825
  taxAmount: number;
  total: number;
  profitMargin: number; // e.g., 24.5
  termsAndCommitment?: string;
  warrantyType?: string;
  warrantyTypes?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  roleCategory: "sales" | "pm" | "install" | "admin" | "staff" | "contractor";
  avatar: string;
  status: "Available" | "On Site (Busy)" | "Offline";
  activeLeads?: number;
  closeRate?: number;
  activeProjects?: number;
  sitesInspected?: number;
  crewMembersCount?: number;
  onTimeRate?: number;
  company?: string;
  companyInviteCode?: string;
  organizationId?: string;
  organizationIds?: string[];
  email?: string;
  phone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  registrationNumber?: string;
  licenseNumber?: string;
}

export interface MaterialItem {
  id: string;
  description: string;
  category: 'material' | 'labor' | 'fee';
  unit: string;
  unitPrice: number;
  originalDescription?: string;
}


