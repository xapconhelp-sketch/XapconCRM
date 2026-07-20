export enum ViewType {
  DASHBOARD = "dashboard",
  INSURANCE_CLAIM = "insurance_claim",
  CLAIMS = "claims",
  PRODUCTION = "production",
  FINANCIALS = "financials",
  TEAM = "team"
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
  assignedTo?: string;
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

export interface CashData {
  rcv?: number;
  acv?: number;
  deducible?: number;
  depreciacion?: number;
  depreNoRecuperable?: number;
  primerCheque?: number;
  segundoCheque?: number;
  tercerCheque?: number;
  suplemento1?: number;
  suplemento2?: number;
  suplemento3?: number;
  suplemento1Col2?: number;
  suplemento2Col2?: number;
  suplemento3Col2?: number;
  valorMaterial?: number;
  valorLabor?: number;
  valorTax?: number;
  valorPermisos?: number;
  perdidaRepentina?: number;
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
  subtotalGross: number;
  taxRate: number; // e.g., 0.0825
  taxAmount: number;
  total: number;
  profitMargin: number; // e.g., 24.5
  cashData?: CashData;
  termsAndCommitment?: string;
  warrantyType?: string;
  warrantyTypes?: string[];
}

export interface KanbanProject {
  id: string;
  title: string;
  address: string;
  projectCode: string;
  category: string;
  durationEstimate: string;
  status: "scheduled" | "ordered" | "in_progress" | "qa";
  statusText?: string;
  progress?: number;
  crews?: { name: string; avatar: string }[];
  isWarning?: boolean;
  warningText?: string;
  company?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  projectCategory: string;
  amount: number;
  status: "Paid" | "Overdue" | "Pending";
  company?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  roleCategory: "sales" | "pm" | "install" | "admin" | "contractor";
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
  email?: string;
  phone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  registrationNumber?: string;
  licenseNumber?: string;
}

export interface CriticalAlert {
  id: string;
  type: "document" | "material" | "safety" | "inspection";
  title: string;
  description: string;
  targetId?: string;
  buttonText: string;
}

export interface InspectionAppointment {
  id: string;
  dateTime: string;
  timeRemaining?: string;
  clientName: string;
  address: string;
  type: string;
  inspectorName: string;
  inspectorInitials: string;
}

export interface MaterialItem {
  id: string;
  description: string;
  category: 'material' | 'labor' | 'fee';
  unit: string;
  unitPrice: number;
  originalDescription?: string;
}


