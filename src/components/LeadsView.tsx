import React, { useState, useEffect, useRef } from "react";
import { Lead, TimelineEvent, TaskItem, DocumentItem, TeamMember, ViewType } from "../types";
import { 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Building, 
  Grid, 
  FileCheck2, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  Circle,
  Home,
  FileText,
  FileSignature,
  FileImage,
  Upload,
  Clock,
  Send,
  MessageSquare,
  Bot,
  Trash2,
  X,
  ArrowLeft,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { CashData } from "../types";
const INSURANCE_COMPANIES = [
  "Assurant",
  "State Farm",
  "Allstate",
  "USAA",
  "Liberty Mutual",
  "Farmers Insurance",
  "Travelers",
  "American Family Insurance",
  "Nationwide",
  "Progressive",
  "Auto-Owners Insurance",
  "Cincinnati Financial",
  "Auto Club Enterprises (AAA)",
  "Kemper",
  "Mercury Insurance",
  "Saffeco Insurance",
  "The Hartford",
  "National General",
  "CSAA General",
  "Proctor Insurance",
  "Homesite Insurance",
  "Pinnacle Claim Service"
];

const DAMAGE_TYPES = [
  "Hail Damage",
  "Wind Damage",
  "Impact damage",
  "Creasing (stress fractures)",
  "Material fatigue",
  "Mechanical damage (human error)",
  "Installation defect",
  "Leakage from penetrations",
  "Wear and Tear",
  "Manufacturing defect",
  "Cosmetic damage",
  "Water Damage",
  "Windstorm and Hail",
  "Fire Damage",
  "Hurricane Damage"
];

interface LeadsViewProps {
  leads: Lead[];
  selectedLeadId: string;
  onSelectLead: (leadId: string) => void;
  onAddTimelineEvent: (leadId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => Promise<void> | void;
  onToggleTask: (leadId: string, taskId: string) => void;
  onAddLead: (lead: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => void;
  onUploadDocuments?: (leadId: string, files: File[], category?: string) => Promise<boolean>;
  onDeleteDocument?: (leadId: string, docId: string, filePath?: string) => Promise<boolean>;
  onUploadImageForTimeline?: (file: File) => Promise<string | null>;
  onDeleteTimelineEvent?: (leadId: string, eventId: string) => Promise<void> | void;
  onAddTask?: (leadId: string, title: string, assignedTo?: string) => Promise<void> | void;
  onDeleteTask?: (leadId: string, taskId: string) => Promise<void> | void;
  viewTitle?: string;
  viewSubtitle?: string;
  addButtonLabel?: string;
  formTitle?: string;
  formSubmitLabel?: string;
  isInsuranceView?: boolean;
  organizations?: { id: string; name: string }[];
  userRole?: "admin" | "contractor";
  teamMembers?: TeamMember[];
  searchTerm?: string;
  onUpdateLead?: (leadId: string, updatedFields: Partial<Lead>) => Promise<void> | void;
  activeOrganizationId?: string;
  onNavigateToView?: (view: ViewType) => void;
  onMoveProject?: (projectId: string, direction: "next" | "prev") => void;
}

export default function LeadsView({
  leads,
  selectedLeadId,
  onSelectLead,
  onAddTimelineEvent,
  onToggleTask,
  onAddLead,
  onUploadDocuments,
  onDeleteDocument,
  onUploadImageForTimeline,
  onDeleteTimelineEvent,
  onAddTask,
  onDeleteTask,
  viewTitle,
  viewSubtitle,
  addButtonLabel,
  formTitle,
  formSubmitLabel,
  isInsuranceView,
  organizations = [],
  userRole = "admin",
  teamMembers = [],
  searchTerm = "",
  onUpdateLead,
  activeOrganizationId,
  onNavigateToView,
  onMoveProject
}: LeadsViewProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "documents" | "cash" | "tasks">("timeline");
  const [newNote, setNewNote] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations]);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Cash flow states
  const [cashInputs, setCashInputs] = useState<Record<string, string>>({});
  const [showProfitsModal, setShowProfitsModal] = useState(false);
  
  // New Lead Form State
  const [leadName, setLeadName] = useState("");
  const [leadAddress, setLeadAddress] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSqft, setLeadSqft] = useState(2000);
  const [leadInsurance, setLeadInsurance] = useState("State Farm");
  const [leadAssignedRep, setLeadAssignedRep] = useState("");

  // Extra fields for Insurance View
  const [leadPhone2, setLeadPhone2] = useState("");
  const [leadEmail2, setLeadEmail2] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceDamage, setInsuranceDamage] = useState("Hail Damage");
  const [insuranceLossDate, setInsuranceLossDate] = useState("");
  const [insPhone1, setInsPhone1] = useState("");
  const [insPhone2, setInsPhone2] = useState("");
  const [insEmail1, setInsEmail1] = useState("");
  const [insEmail2, setInsEmail2] = useState("");

  // In-place editing state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editInsuranceProvider, setEditInsuranceProvider] = useState("");
  const [editClaimNumber, setEditClaimNumber] = useState("");
  const [editPolicyNumber, setEditPolicyNumber] = useState("");
  const [editDamageType, setEditDamageType] = useState("");
  const [editLossDate, setEditLossDate] = useState("");
  const [editAdjusterName, setEditAdjusterName] = useState("");
  const [editInsurancePhone1, setEditInsurancePhone1] = useState("");
  const [editInsurancePhone2, setEditInsurancePhone2] = useState("");
  const [editAssignedRep, setEditAssignedRep] = useState("");
  const [editOrgId, setEditOrgId] = useState("");
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhone2, setEditPhone2] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmail2, setEditEmail2] = useState("");
  const [editPropertyType, setEditPropertyType] = useState("Residential - Single Family");
  const [editSqft, setEditSqft] = useState("");
  const [editInsuranceEmail1, setEditInsuranceEmail1] = useState("");
  const [editInsuranceEmail2, setEditInsuranceEmail2] = useState("");

  const handleStartEdit = () => {
    if (!selectedLead) return;
    setEditInsuranceProvider(selectedLead.insuranceProvider || "");
    setEditClaimNumber(selectedLead.claimNumber || "");
    setEditPolicyNumber(selectedLead.policyNumber || "");
    setEditDamageType(selectedLead.damageType || "");
    setEditLossDate(selectedLead.lossDate || "");
    setEditAdjusterName(selectedLead.adjusterName || "");
    setEditInsurancePhone1(selectedLead.insurancePhone1 || "");
    setEditInsurancePhone2(selectedLead.insurancePhone2 || "");
    setEditAssignedRep(selectedLead.assignedRep || "");
    setEditOrgId(selectedLead.organizationId || "");
    setEditName(selectedLead.name || "");
    setEditAddress(selectedLead.address || "");
    setEditPhone(selectedLead.phone || "");
    setEditPhone2(selectedLead.phone2 || "");
    setEditEmail(selectedLead.email || "");
    setEditEmail2(selectedLead.email2 || "");
    setEditPropertyType(selectedLead.propertyType || "Residential - Single Family");
    setEditSqft(selectedLead.sqft ? selectedLead.sqft.toString() : "");
    setEditInsuranceEmail1(selectedLead.insuranceEmail1 || "");
    setEditInsuranceEmail2(selectedLead.insuranceEmail2 || "");
    setIsEditingLead(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedLead || !onUpdateLead) return;
    
    await onUpdateLead(selectedLead.id, {
      name: editName,
      address: editAddress,
      phone: editPhone,
      phone2: editPhone2,
      email: editEmail,
      email2: editEmail2,
      propertyType: editPropertyType,
      sqft: editSqft ? parseInt(editSqft) : 2000,
      insuranceEmail1: editInsuranceEmail1,
      insuranceEmail2: editInsuranceEmail2,
      insuranceProvider: editInsuranceProvider,
      claimNumber: editClaimNumber,
      policyNumber: editPolicyNumber,
      damageType: editDamageType,
      lossDate: editLossDate,
      adjusterName: editAdjusterName,
      insurancePhone1: editInsurancePhone1,
      insurancePhone2: editInsurancePhone2,
      assignedRep: editAssignedRep,
      organizationId: editOrgId || undefined
    });
    
    setIsEditingLead(false);
  };
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState("");
  const [leadAdjusterName, setLeadAdjusterName] = useState("");
  const [homeownerNotes, setHomeownerNotes] = useState("");

  const selectedLead = selectedLeadId ? (leads.find((l) => l.id === selectedLeadId) || leads[0]) : null;

  const PIPELINE_STAGES = [
    "Negados",
    "Inspección",
    "En disputa",
    "Esperando Scope",
    "Aprobado y Suplementado",
    "Construcción",
    "Esperando Depreciación",
    "Finalizado",
    "Cancelado"
  ];

  let currentStageIndex = -1;
  if (selectedLead) {
    if (selectedLead.status === "Nuevo") {
      currentStageIndex = 0; // Treat 'Nuevo' as initial state before Inspección
    } else {
      currentStageIndex = PIPELINE_STAGES.indexOf(selectedLead.status);
      if (currentStageIndex === -1) {
        currentStageIndex = 1; // Fallback to Inspección for active custom states
      }
    }
  }

  const handleStageMove = (direction: "next" | "prev") => {
    if (!selectedLead) return;

    let targetIdx = currentStageIndex;
    if (selectedLead.status === "Nuevo") {
      targetIdx = direction === "next" ? 1 : 0;
    } else {
      if (direction === "next" && targetIdx < PIPELINE_STAGES.length - 1) {
        targetIdx = targetIdx + 1;
      } else if (direction === "prev" && targetIdx > 0) {
        targetIdx = targetIdx - 1;
      }
    }

    const newStatus = PIPELINE_STAGES[targetIdx];

    if (onMoveProject) {
      onMoveProject(selectedLead.id, direction);
    }
    if (onUpdateLead && newStatus !== selectedLead.status) {
      onUpdateLead(selectedLead.id, { status: newStatus });
    }
  };

  // Filter allowed team members for assignments and mentions
  const allowedTeamMembers = selectedLead ? teamMembers.filter(m => {
    if (userRole === 'admin') {
      return selectedLead.organizationId 
        ? m.organizationId === selectedLead.organizationId 
        : m.company === selectedLead.company;
    } else {
      return activeOrganizationId 
        ? m.organizationId === activeOrganizationId 
        : true; // fallback
    }
  }) : [];

  // Sync cash inputs text values from lead's database object
  useEffect(() => {
    setIsEditingLead(false);
    if (selectedLead) {
      setEditInsuranceProvider(selectedLead.insuranceProvider || "");
      setEditClaimNumber(selectedLead.claimNumber || "");
      setEditPolicyNumber(selectedLead.policyNumber || "");
      setEditDamageType(selectedLead.damageType || "");
      setEditLossDate(selectedLead.lossDate || "");
      setEditAdjusterName(selectedLead.adjusterName || "");
      setEditInsurancePhone1(selectedLead.insurancePhone1 || "");
      setEditInsurancePhone2(selectedLead.insurancePhone2 || "");
      setEditAssignedRep(selectedLead.assignedRep || "");
      setEditOrgId(selectedLead.organizationId || "");
      setEditName(selectedLead.name || "");
      setEditAddress(selectedLead.address || "");
      setEditPhone(selectedLead.phone || "");
      setEditPhone2(selectedLead.phone2 || "");
      setEditEmail(selectedLead.email || "");
      setEditEmail2(selectedLead.email2 || "");
      setEditPropertyType(selectedLead.propertyType || "Residential - Single Family");
      setEditSqft(selectedLead.sqft ? selectedLead.sqft.toString() : "");
      setEditInsuranceEmail1(selectedLead.insuranceEmail1 || "");
      setEditInsuranceEmail2(selectedLead.insuranceEmail2 || "");
    }

    if (selectedLead && selectedLead.estimate?.cashData) {
      const data = selectedLead.estimate.cashData;
      const inputs: Record<string, string> = {};
      Object.keys(data).forEach(k => {
        const val = (data as any)[k];
        inputs[k] = val !== undefined && val !== null ? val.toString() : "";
      });
      setCashInputs(inputs);
    } else {
      setCashInputs({});
    }
  }, [selectedLead?.id]);

  const handleLocalCashChange = (key: string, valStr: string) => {
    let cleanStr = valStr.replace(/[^0-9.]/g, "");
    const parts = cleanStr.split(".");
    if (parts.length > 2) {
      cleanStr = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    setCashInputs(prev => ({
      ...prev,
      [key]: cleanStr
    }));
  };

  const saveCashData = async () => {
    if (!selectedLead || !onUpdateLead) return;
    
    const dataToSave: CashData = {};
    const keys = [
      "rcv", "acv", "deducible", "depreciacion", "depreNoRecuperable",
      "primerCheque", "segundoCheque", "tercerCheque",
      "suplemento1", "suplemento2", "suplemento3",
      "valorMaterial", "valorLabor", "valorTax", "valorPermisos", "perdidaRepentina"
    ];

    keys.forEach(k => {
      const strVal = cashInputs[k];
      if (strVal !== undefined && strVal !== "") {
        const parsed = parseFloat(strVal);
        if (!isNaN(parsed)) {
          (dataToSave as any)[k] = parsed;
        }
      }
    });

    const updatedEstimate = {
      ...(selectedLead.estimate || {
        id: `est-${Date.now()}`,
        leadId: selectedLead.id,
        clientName: selectedLead.name,
        address: selectedLead.address || "",
        status: "Draft" as const,
        items: [],
        subtotalMaterials: 0,
        subtotalLabor: 0,
        subtotalFees: 0,
        subtotalGross: 0,
        taxRate: 0,
        taxAmount: 0,
        total: 0,
        profitMargin: 0
      }),
      cashData: dataToSave
    };
    
    await onUpdateLead(selectedLead.id, { estimate: updatedEstimate });
  };

  const getProfitsBreakdown = () => {
    const parseVal = (k: string) => {
      const str = cashInputs[k];
      if (!str) return 0;
      const val = parseFloat(str);
      return isNaN(val) ? 0 : val;
    };
    
    const primerCheque = parseVal("primerCheque");
    const segundoCheque = parseVal("segundoCheque");
    const tercerCheque = parseVal("tercerCheque");
    const deducible = parseVal("deducible");
    const sup1 = parseVal("suplemento1");
    const sup2 = parseVal("suplemento2");
    const sup3 = parseVal("suplemento3");
    
    const totalRevenue = primerCheque + segundoCheque + tercerCheque + deducible + sup1 + sup2 + sup3;
    
    const mat = parseVal("valorMaterial");
    const lab = parseVal("valorLabor");
    const tax = parseVal("valorTax");
    const perm = parseVal("valorPermisos");
    const loss = parseVal("perdidaRepentina");
    
    const totalCosts = mat + lab + tax + perm + loss;
    
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return {
      primerCheque,
      segundoCheque,
      tercerCheque,
      deducible,
      sup1,
      sup2,
      sup3,
      totalRevenue,
      mat,
      lab,
      tax,
      perm,
      loss,
      totalCosts,
      netProfit,
      profitMargin
    };
  };

  const handleOpenProfits = async () => {
    await saveCashData();
    if (onNavigateToView) {
      onNavigateToView(ViewType.FINANCIALS);
    }
  };

  const filteredLeadsForSearch = leads.filter(lead => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return true;
    return (
      (lead.name && lead.name.toLowerCase().includes(term)) ||
      (lead.claimNumber && lead.claimNumber.toLowerCase().includes(term)) ||
      (lead.address && lead.address.toLowerCase().includes(term)) ||
      (lead.phone && lead.phone.toLowerCase().includes(term)) ||
      (lead.policyNumber && lead.policyNumber.toLowerCase().includes(term)) ||
      (lead.adjusterName && lead.adjusterName.toLowerCase().includes(term)) ||
      (lead.assignedRep && lead.assignedRep.toLowerCase().includes(term))
    );
  });

  const getDaysSinceLastUpdate = (lead: Lead) => {
    let lastTimestamp = lead.createdAt ? Date.parse(lead.createdAt) : Date.now();
    if (isNaN(lastTimestamp)) {
      const parts = lead.createdAt.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const y = parseInt(parts[2]);
        const parsedDate = new Date(y, m, d);
        if (!isNaN(parsedDate.getTime())) {
          lastTimestamp = parsedDate.getTime();
        }
      } else {
        lastTimestamp = Date.now();
      }
    }
    
    if (lead.timeline && lead.timeline.length > 0) {
      lead.timeline.forEach(event => {
        const match = event.id.match(/\d+/);
        if (match) {
          const ts = parseInt(match[0]);
          if (ts > 1000000000000 && ts < 5000000000000) {
            if (ts > lastTimestamp) {
              lastTimestamp = ts;
            }
          }
        }
      });
    }
    const diffMs = Date.now() - lastTimestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [isUploadingNote, setIsUploadingNote] = useState(false);
  
  // Mentions state
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!onUploadDocuments || !selectedLead) return;

    setIsUploading(true);
    try {
      const filesArray = Array.from(e.target.files) as File[];
      await onUploadDocuments(selectedLead.id, filesArray, "Reporte");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadFile = async (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    if (!doc.url) return;
    try {
      const response = await fetch(doc.url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error downloading file:", err);
      window.open(doc.url, "_blank");
    }
  };

  if (!selectedLead && !isAddingLead) {
    if (leads.length === 0) {
      return (
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-6 lg:p-8 overflow-y-auto">
          <div className="flex flex-col items-center justify-center bg-slate-800/40 rounded-3xl border border-slate-700/50 p-12 text-center max-w-md">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No hay registros</h2>
            <p className="text-slate-400 mb-8">
              No se encontró ningún registro en la base de datos. Haz clic en el botón de abajo para empezar a registrar información real.
            </p>
            <button
              onClick={() => setIsAddingLead(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-5 h-5" />
              {addButtonLabel || "Añadir Nuevo"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-[#f7f9fb]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
          <div>
            <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">
              {viewTitle || "Carpeta de Leads & Clientes"}
            </h1>
            <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">
              {viewSubtitle || "Cronologías de reclamos de seguros, visitas de peritos y archivos técnicos de propiedad."}
            </p>
          </div>
          <button
            onClick={() => setIsAddingLead(true)}
            className="btn-responsive btn-gold-3d px-4 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            {addButtonLabel || "Crear Nuevo Lead"}
          </button>
        </div>

        {/* Horizontal Case Cards List */}
        <div className="space-y-3 max-w-7xl mx-auto">
          {/* Grid Column Headers for Desktop */}
          {filteredLeadsForSearch.length > 0 && (
            <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E4EA] mb-1 select-none">
              <div className="col-span-3">Cliente</div>
              <div className="col-span-3">Dirección</div>
              <div className="col-span-2">Claim</div>
              <div className="col-span-2">Empresa</div>
              <div className="col-span-1 text-center">Etapa</div>
              <div className="col-span-1 text-right">Días</div>
            </div>
          )}

          {filteredLeadsForSearch.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#c6c6cd]/30 rounded-2xl text-xs text-slate-500 font-semibold shadow-sm">
              No se encontraron casos para la búsqueda actual
            </div>
          ) : (
            filteredLeadsForSearch.map((lead) => {
              const days = getDaysSinceLastUpdate(lead);
              const statusBorderClass = ({
                "Inspección": "lead-card-border-inspeccion",
                "En disputa": "lead-card-border-disputa",
                "Esperando Scope": "lead-card-border-scope",
                "Aprobado y Suplementado": "lead-card-border-aprobado",
                "Construcción": "lead-card-border-construccion",
                "Esperando Depreciación": "lead-card-border-depreciacion",
                "Finalizado": "lead-card-border-finalizado",
                "Negados": "lead-card-border-negados",
              } as Record<string, string>)[lead.status] || "lead-card-border-default";

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className={`p-4 bg-white border border-[#E2E4EA] rounded-xl ambient-shadow-hover cursor-pointer transition-all duration-200 group ${statusBorderClass}`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Col 1: Icon + Client Name */}
                    <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#FEF3C7]">
                        <Home className="w-4 h-4 text-[#B8860B]" />
                      </div>
                      <span className="text-sm font-bold text-[#0F172A] tracking-tight group-hover:text-[#B8860B] transition-colors truncate">
                        {lead.name}
                      </span>
                    </div>

                    {/* Col 2: Address */}
                    <div className="lg:col-span-3 flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{lead.address || "Sin dirección"}</span>
                    </div>

                    {/* Col 3: Claim Number */}
                    <div className="lg:col-span-2 text-xs text-[#64748B] truncate">
                      <span className="text-slate-400 lg:hidden font-semibold">Claim: </span>
                      <span className="font-mono font-medium text-slate-700">{lead.claimNumber || "N/A"}</span>
                    </div>

                    {/* Col 4: Empresa */}
                    <div className="lg:col-span-2 text-xs text-[#64748B] truncate">
                      <span className="text-slate-400 lg:hidden font-semibold">Empresa: </span>
                      <span className="font-semibold text-[#0F172A]">{lead.company || "Xapcon Group"}</span>
                    </div>

                    {/* Col 5: Etapa */}
                    <div className="lg:col-span-1 flex items-center lg:justify-center">
                      <span className="px-2.5 py-1 bg-[#eab308] text-[#0F172A] text-[9px] rounded-md font-extrabold uppercase tracking-wider whitespace-nowrap shadow-sm">
                        {lead.status}
                      </span>
                    </div>

                    {/* Col 6: Días / 3D Finalizado Checkmark Icon + Chevron */}
                    <div className="lg:col-span-1 flex items-center justify-end gap-2.5 shrink-0">
                      {lead.status === "Finalizado" ? (
                        <div 
                          className="w-8 h-8 rounded-full bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-[0_3px_8px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] border border-emerald-400/60 transition-transform hover:scale-105 shrink-0"
                          title="Caso Finalizado"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white fill-emerald-800 shrink-0 drop-shadow-sm" />
                        </div>
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full bg-gradient-to-b from-red-500 to-red-600 text-white font-extrabold text-xs flex items-center justify-center shadow-[0_2px_6px_rgba(239,68,68,0.35)] border border-red-400/40 shrink-0"
                          title={`Sin actualizar hace ${days} ${days === 1 ? 'día' : 'días'}`}
                        >
                          {days}
                        </div>
                      )}
                      <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#B8860B] transition-colors hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
  
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !onAddTask || !selectedLead) return;

    setIsAddingTask(true);
    try {
      await onAddTask(selectedLead.id, newTaskTitle.trim(), newTaskAssignedTo || undefined);
      setNewTaskTitle("");
      setNewTaskAssignedTo("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingTask(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const newFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) newFiles.push(file);
      }
    }
    
    if (newFiles.length > 0) {
      setPastedImages(prev => [...prev, ...newFiles]);
    }
  };

  const removePastedImage = (index: number) => {
    setPastedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    
    setNewNote(value);
    setCursorPosition(pos);
    const textBeforeCursor = value.substring(0, pos);
    const lastAtSign = textBeforeCursor.lastIndexOf("@");
    
    const isAtStartOrAfterSpace = lastAtSign === 0 || /\s/.test(textBeforeCursor.charAt(lastAtSign - 1));
    if (
      lastAtSign !== -1 && 
      isAtStartOrAfterSpace && 
      !textBeforeCursor.substring(lastAtSign).includes(" ")
    ) {
      setShowMentions(true);
      setMentionFilter(textBeforeCursor.substring(lastAtSign + 1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: inserts newline naturally
      } else {
        // Enter without Shift: submits form
        e.preventDefault();
        const form = e.currentTarget.closest("form");
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  const insertMention = (member: TeamMember) => {
    const lastAtPos = newNote.lastIndexOf("@", cursorPosition - 1);
    const textBeforeAt = newNote.substring(0, lastAtPos);
    const textAfterCursor = newNote.substring(cursorPosition);
    
    const firstName = member.name ? member.name.split(" ")[0] : "Usuario";
    
    const updatedText = `${textBeforeAt}@${firstName} ${textAfterCursor}`;
    setNewNote(updatedText);
    setShowMentions(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() && pastedImages.length === 0) return;
    
    setIsUploadingNote(true);
    let uploadedUrls: string[] = [];
    
    if (pastedImages.length > 0 && onUploadImageForTimeline) {
      for (const file of pastedImages) {
        const url = await onUploadImageForTimeline(file);
        if (url) uploadedUrls.push(url);
      }
    }
    
    await onAddTimelineEvent(selectedLead.id, {
      type: "note",
      author: "Michael Chen", // Current user
      title: "Nueva Nota Registrada",
      content: newNote.trim(),
      photos: uploadedUrls.length > 0 ? uploadedUrls : undefined
    });
    setNewNote("");
    setPastedImages([]);
    setIsUploadingNote(false);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) return;
    
    onAddLead({
      name: leadName,
      status: "Nuevo",
      address: leadAddress || "No registrada",
      phone: leadPhone || "No registrado",
      phone2: isInsuranceView ? leadPhone2 : undefined,
      email: leadEmail || "No registrado",
      email2: isInsuranceView ? leadEmail2 : undefined,
      propertyType: "Residential - Single Family",
      sqft: Number(leadSqft) || 1500,
      insuranceProvider: leadInsurance,
      claimNumber: isInsuranceView ? (insuranceClaimNumber || "Por reclamar") : "Por reclamar",
      policyNumber: isInsuranceView ? insurancePolicy : undefined,
      damageType: isInsuranceView ? insuranceDamage : undefined,
      lossDate: isInsuranceView ? insuranceLossDate : undefined,
      insurancePhone1: isInsuranceView ? insPhone1 : undefined,
      insurancePhone2: isInsuranceView ? insPhone2 : undefined,
      insuranceEmail1: isInsuranceView ? insEmail1 : undefined,
      insuranceEmail2: isInsuranceView ? insEmail2 : undefined,
      notes: isInsuranceView ? homeownerNotes : undefined,
      adjusterName: isInsuranceView ? (leadAdjusterName || "Por asignar") : "Por asignar",
      assignedRep: leadAssignedRep.trim() || "Por asignar",
      assignedRepAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA3-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC",
      organizationId: userRole === "admin" ? (selectedOrgId || undefined) : undefined
    });

    // Reset
    setLeadName("");
    setLeadAddress("");
    setLeadPhone("");
    setLeadEmail("");
    setLeadPhone2("");
    setLeadEmail2("");
    setLeadAssignedRep("");
    setInsurancePolicy("");
    setInsuranceDamage("Hail Damage");
    setInsuranceLossDate("");
    setInsPhone1("");
    setInsPhone2("");
    setInsEmail1("");
    setInsEmail2("");
    setInsuranceClaimNumber("");
    setLeadAdjusterName("");
    setHomeownerNotes("");
    setIsAddingLead(false);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">{viewTitle || "Carpeta de Leads & Clientes"}</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">{viewSubtitle || "Cronologías de reclamos de seguros, visitas de peritos y archivos técnicos de propiedad."}</p>
        </div>
        <button
          onClick={() => setIsAddingLead(!isAddingLead)}
          className="btn-responsive btn-gold-3d px-4 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          {addButtonLabel || "Crear Nuevo Lead"}
        </button>
      </div>

      {isAddingLead && (
        <form onSubmit={handleCreateLead} className="w-full space-y-6">
          {isInsuranceView ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Left Card: Homeowner Details */}
              <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-sans text-sm font-bold text-[#131b2e] border-b pb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-[#ca8a04] font-bold">1</span>
                    <span>Datos del Homeowner (Propietario)</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userRole === "admin" && organizations && organizations.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-[#ca8a04] mb-1">Empresa / Contratista Asignado</label>
                        <select 
                          value={selectedOrgId} 
                          onChange={(e) => setSelectedOrgId(e.target.value)}
                          className="w-full bg-white border border-[#c6c6cd]/80 rounded-lg p-2 text-xs text-[#191c1e] font-bold focus:border-[#eab308] outline-none cursor-pointer"
                          required
                        >
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={leadName} 
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="Nombre del propietario" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Dirección Física</label>
                      <input 
                        type="text" 
                        value={leadAddress} 
                        onChange={(e) => setLeadAddress(e.target.value)}
                        placeholder="Ej. 1244 Maplewood Dr, Austin" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 1</label>
                      <input 
                        type="text" 
                        value={leadPhone} 
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="(555) 012-3456" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 1</label>
                      <input 
                        type="email" 
                        value={leadEmail} 
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="ejemplo@correo.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 2</label>
                      <input 
                        type="text" 
                        value={leadPhone2} 
                        onChange={(e) => setLeadPhone2(e.target.value)}
                        placeholder="Segundo teléfono" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 2</label>
                      <input 
                        type="email" 
                        value={leadEmail2} 
                        onChange={(e) => setLeadEmail2(e.target.value)}
                        placeholder="segundo@correo.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre del Vendedor (Rep. Asignado)</label>
                      <input 
                        type="text" 
                        value={leadAssignedRep} 
                        onChange={(e) => setLeadAssignedRep(e.target.value)}
                        placeholder="Ej. Michael Chen" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nota (Observación Extra)</label>
                      <textarea 
                        value={homeownerNotes} 
                        onChange={(e) => setHomeownerNotes(e.target.value)}
                        placeholder="Escribe alguna observación o comentario extra del propietario..." 
                        rows={3}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Card: Insurance Details */}
              <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-sans text-sm font-bold text-[#131b2e] border-b pb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-[#ca8a04] font-bold">2</span>
                    <span>Datos de la Aseguradora</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Compañía de Seguros</label>
                      <select 
                        value={leadInsurance}
                        onChange={(e) => setLeadInsurance(e.target.value)}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      >
                        {INSURANCE_COMPANIES.map((company) => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Número de Claim</label>
                      <input 
                        type="text" 
                        value={insuranceClaimNumber} 
                        onChange={(e) => setInsuranceClaimNumber(e.target.value)}
                        placeholder="Número de reclamación" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre Ajustador</label>
                      <input 
                        type="text" 
                        value={leadAdjusterName} 
                        onChange={(e) => setLeadAdjusterName(e.target.value)}
                        placeholder="Ej. John Doe" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Número de Póliza</label>
                      <input 
                        type="text" 
                        value={insurancePolicy} 
                        onChange={(e) => setInsurancePolicy(e.target.value)}
                        placeholder="Número de póliza" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Tipo de Daño</label>
                      <select 
                        value={insuranceDamage} 
                        onChange={(e) => setInsuranceDamage(e.target.value)}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      >
                        {DAMAGE_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Fecha de Pérdida</label>
                      <input 
                        type="date" 
                        value={insuranceLossDate} 
                        onChange={(e) => setInsuranceLossDate(e.target.value)}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono Seguro 1</label>
                      <input 
                        type="text" 
                        value={insPhone1} 
                        onChange={(e) => setInsPhone1(e.target.value)}
                        placeholder="Teléfono primario" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono Seguro 2</label>
                      <input 
                        type="text" 
                        value={insPhone2} 
                        onChange={(e) => setInsPhone2(e.target.value)}
                        placeholder="Teléfono secundario" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Seguro 1</label>
                      <input 
                        type="email" 
                        value={insEmail1} 
                        onChange={(e) => setInsEmail1(e.target.value)}
                        placeholder="correo1@seguro.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Seguro 2</label>
                      <input 
                        type="email" 
                        value={insEmail2} 
                        onChange={(e) => setInsEmail2(e.target.value)}
                        placeholder="correo2@seguro.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          ) : (
            // Leads view - Single card
            <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm space-y-4 max-w-2xl">
              <h3 className="font-sans text-sm font-bold text-[#131b2e] border-b pb-2">{formTitle || "Ficha de Nuevo Prospecto de Cliente"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRole === "admin" && organizations && organizations.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#ca8a04] mb-1">Empresa / Contratista Asignado</label>
                    <select 
                      value={selectedOrgId} 
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full bg-white border border-[#c6c6cd]/80 rounded-lg p-2 text-xs text-[#191c1e] font-bold focus:border-[#eab308] outline-none cursor-pointer"
                      required
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={leadName} 
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Nombre del propietario" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Dirección Física</label>
                  <input 
                    type="text" 
                    value={leadAddress} 
                    onChange={(e) => setLeadAddress(e.target.value)}
                    placeholder="Ej. 1244 Maplewood Dr, Austin" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 1</label>
                  <input 
                    type="text" 
                    value={leadPhone} 
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="(555) 012-3456" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 1</label>
                  <input 
                    type="email" 
                    value={leadEmail} 
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="ejemplo@correo.com" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Superficie Estimada (SQFT)</label>
                  <input 
                    type="number" 
                    value={leadSqft} 
                    onChange={(e) => setLeadSqft(Number(e.target.value))}
                    placeholder="2000" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Compañía de Seguros</label>
                  <select 
                    value={leadInsurance}
                    onChange={(e) => setLeadInsurance(e.target.value)}
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  >
                    {INSURANCE_COMPANIES.map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre del Vendedor (Rep. Asignado)</label>
                  <input 
                    type="text" 
                    value={leadAssignedRep} 
                    onChange={(e) => setLeadAssignedRep(e.target.value)}
                    placeholder="Ej. Michael Chen" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Action buttons (fixed/styled row) */}
          <div className={`flex justify-end gap-2 p-4 bg-white border border-[#c6c6cd]/30 rounded-2xl shadow-sm w-full ${isInsuranceView ? "" : "max-w-2xl"}`}>
            <button 
              type="button" 
              onClick={() => setIsAddingLead(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-responsive btn-gold-3d px-4 py-2 bg-[#eab308] text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-[#ca8a04] transition-colors"
            >
              {formSubmitLabel || "Registrar Prospecto"}
            </button>
          </div>
          
        </form>
      )}

      {/* Main Content Pane */}
      {selectedLead && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna 2: Ficha Técnica (Dividida en 2 Cuadros: Homeowner e Información del Seguro) */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          
          {/* CUADRO 1: Información del Homeowner */}
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 w-full">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-[#B8860B]" />
                <h2 className="font-sans text-xs font-bold text-[#131b2e]">Información del Homeowner</h2>
              </div>
              {!isEditingLead && onUpdateLead && (
                <button 
                  type="button"
                  onClick={handleStartEdit} 
                  className="text-[#ca8a04] hover:text-[#eab308] text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Editar
                </button>
              )}
            </div>

            {isEditingLead ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre Propietario</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dirección Física</label>
                  <input 
                    type="text" 
                    value={editAddress} 
                    onChange={(e) => setEditAddress(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono Principal</label>
                  <input 
                    type="text" 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono Secundario</label>
                  <input 
                    type="text" 
                    value={editPhone2} 
                    onChange={(e) => setEditPhone2(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Secundario</label>
                  <input 
                    type="email" 
                    value={editEmail2} 
                    onChange={(e) => setEditEmail2(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Propiedad</label>
                  <select 
                    value={editPropertyType} 
                    onChange={(e) => setEditPropertyType(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  >
                    <option value="Residential - Single Family">Residencial - Single Family</option>
                    <option value="Residential - Multi Family">Residencial - Multi Family</option>
                    <option value="Commercial">Comercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pies Cuadrados (Sqft)</label>
                  <input 
                    type="number" 
                    value={editSqft} 
                    onChange={(e) => setEditSqft(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vendedor (Rep. Asignado)</label>
                  <input 
                    type="text" 
                    value={editAssignedRep} 
                    onChange={(e) => setEditAssignedRep(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-center">
                <div>
                  <span className="text-[#7c839b] font-medium block">Propietario</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.name}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Dirección</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.address || "Sin dirección"}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Teléfono Principal</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.phone || "No registrado"}</span>
                </div>
                {selectedLead.phone2 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Teléfono Secundario</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.phone2}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#7c839b] font-medium block">Correo Electrónico</span>
                  <span className="text-[#131b2e] font-bold block truncate">{selectedLead.email || "No registrado"}</span>
                </div>
                {selectedLead.email2 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Correo Secundario</span>
                    <span className="text-[#131b2e] font-bold block truncate">{selectedLead.email2}</span>
                  </div>
                )}
                <div>
                  <span className="text-[#7c839b] font-medium block">Tipo de Propiedad</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.propertyType || "Residencial"}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Superficie</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.sqft} SQFT (~{(selectedLead.sqft / 100).toFixed(1)} SQ)</span>
                </div>
                {selectedLead.assignedRep && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Rep. Asignado</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.assignedRep}</span>
                  </div>
                )}
                {selectedLead.notes && (
                  <div className="bg-[#f2f4f6]/60 border border-[#c6c6cd]/30 rounded-xl p-3 mt-1">
                    <span className="text-[#7c839b] font-bold block text-[10px] uppercase mb-1">Notas</span>
                    <p className="text-[#191c1e] text-xs leading-relaxed font-medium italic text-center">"{selectedLead.notes}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CUADRO 2: Información del Seguro */}
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 w-full">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <h2 className="font-sans text-xs font-bold text-[#131b2e]">Información del Seguro</h2>
              </div>
            </div>

            {isEditingLead ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Compañía de Seguros</label>
                  <select 
                    value={editInsuranceProvider} 
                    onChange={(e) => setEditInsuranceProvider(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  >
                    {INSURANCE_COMPANIES.map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Número de Claim</label>
                  <input 
                    type="text" 
                    value={editClaimNumber} 
                    onChange={(e) => setEditClaimNumber(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Número de Póliza</label>
                  <input 
                    type="text" 
                    value={editPolicyNumber} 
                    onChange={(e) => setEditPolicyNumber(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Daño</label>
                  <select 
                    value={editDamageType} 
                    onChange={(e) => setEditDamageType(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  >
                    {DAMAGE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha de Pérdida</label>
                  <input 
                    type="date" 
                    value={editLossDate} 
                    onChange={(e) => setEditLossDate(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Perito / Ajustador</label>
                  <input 
                    type="text" 
                    value={editAdjusterName} 
                    onChange={(e) => setEditAdjusterName(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono Seguro 1</label>
                  <input 
                    type="text" 
                    value={editInsurancePhone1} 
                    onChange={(e) => setEditInsurancePhone1(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono Seguro 2</label>
                  <input 
                    type="text" 
                    value={editInsurancePhone2} 
                    onChange={(e) => setEditInsurancePhone2(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Seguro 1</label>
                  <input 
                    type="email" 
                    value={editInsuranceEmail1} 
                    onChange={(e) => setEditInsuranceEmail1(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Seguro 2</label>
                  <input 
                    type="email" 
                    value={editInsuranceEmail2} 
                    onChange={(e) => setEditInsuranceEmail2(e.target.value)} 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-[#c6c6cd]/30 flex flex-col gap-2">
                  <button 
                    type="button"
                    onClick={handleSaveEdit} 
                    className="btn-gold-3d w-full text-center py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingLead(false)} 
                    className="w-full text-center py-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-lg transition-colors cursor-pointer hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-center">
                <div>
                  <span className="text-[#7c839b] font-medium block">Aseguradora</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.insuranceProvider || "No especificada"}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Número de Claim</span>
                  <span className="text-[#131b2e] font-bold block">{selectedLead.claimNumber || "Sin claim"}</span>
                </div>
                {selectedLead.policyNumber && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Número de Póliza</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.policyNumber}</span>
                  </div>
                )}
                {selectedLead.damageType && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Tipo de Daño</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.damageType}</span>
                  </div>
                )}
                {selectedLead.lossDate && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Fecha de Pérdida</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.lossDate}</span>
                  </div>
                )}
                {selectedLead.adjusterName && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Perito / Ajustador</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.adjusterName}</span>
                  </div>
                )}
                {selectedLead.insurancePhone1 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Teléfono Seguro 1</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.insurancePhone1}</span>
                  </div>
                )}
                {selectedLead.insurancePhone2 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Teléfono Seguro 2</span>
                    <span className="text-[#131b2e] font-bold block">{selectedLead.insurancePhone2}</span>
                  </div>
                )}
                {selectedLead.insuranceEmail1 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Correo Seguro 1</span>
                    <span className="text-[#131b2e] font-bold block truncate">{selectedLead.insuranceEmail1}</span>
                  </div>
                )}
                {selectedLead.insuranceEmail2 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Correo Seguro 2</span>
                    <span className="text-[#131b2e] font-bold block truncate">{selectedLead.insuranceEmail2}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#c6c6cd]/30 flex flex-col gap-2">
                  <button className="btn-gold-3d w-full text-center py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg transition-colors cursor-pointer">
                    Escribir Correo a Ajustador
                  </button>
                  <button className="btn-gold-3d w-full text-center py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg transition-colors cursor-pointer">
                    Escribir Correo al HO
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Columna 3: Expediente Completo */}
        <div className="lg:col-span-9 bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          
          {/* Header Metadata of Selected Lead */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#eceef0] pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectLead("")}
                className="mr-2 p-2 border border-[#c6c6cd]/30 rounded-xl hover:bg-slate-50 text-gray-500 hover:text-gray-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                title="Volver al listado"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#eab308] to-[#ca8a04] shadow-lg shadow-[#eab308]/30 border border-white/20 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6 text-white drop-shadow-md" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-sans text-xl font-bold text-[#131b2e] leading-tight flex items-center flex-wrap gap-2">
                  <span>{selectedLead.name}</span>
                  {selectedLead.claimNumber && selectedLead.claimNumber !== "Por reclamar" && selectedLead.claimNumber !== "Pending" && (
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-bold border border-blue-200 shadow-sm">
                      Claim: {selectedLead.claimNumber}
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-[#7c839b] font-medium">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#ca8a04]" /> {selectedLead.address}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedLead.phone}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              {/* Renglón 3 conservado: Estado del Caso */}
              <div className="flex items-center gap-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                  selectedLead.status === "Negados"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : selectedLead.status === "Inspección"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : selectedLead.status === "En disputa"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : selectedLead.status === "Esperando Scope"
                    ? "bg-violet-50 text-violet-700 border-violet-200"
                    : selectedLead.status === "Aprobado y Suplementado"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : selectedLead.status === "Construcción"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : selectedLead.status === "Esperando Depreciación"
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : selectedLead.status === "Finalizado"
                    ? "bg-yellow-50 text-[#854d0e] border-yellow-300"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {selectedLead.status}
                </span>
              </div>

              {/* Botones de Retroceder y Avanzar para cambiar el estado automáticamente */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleStageMove("prev")}
                  disabled={selectedLead.status === "Negados"}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 shadow-sm active:scale-95 cursor-pointer"
                  title="Retroceder a la etapa anterior en el Kanban"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Retroceder</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStageMove("next")}
                  disabled={selectedLead.status === "Cancelado"}
                  className="px-3 py-1.5 bg-[#eab308] hover:bg-[#ca8a04] disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                  title="Avanzar a la siguiente etapa en el Kanban"
                >
                  <span>Avanzar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Control */}
          <div className="flex border-b border-[#eceef0] pb-1.5 gap-4">
            {["timeline", "documents", "cash", "tasks"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`font-sans text-xs font-semibold pb-1 border-b-2 transition-all ${
                  activeTab === tab
                    ? "border-[#eab308] text-[#131b2e] font-bold"
                    : "border-transparent text-[#7c839b] hover:text-[#131b2e]"
                }`}
              >
                {tab === "timeline" ? "Línea de Tiempo" : tab === "documents" ? "Documentos" : tab === "cash" ? "Cash" : "Tareas"}
              </button>
            ))}
          </div>

          {/* Tab content panel */}
          <div className="w-full space-y-4">
              
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  
                  {/* Enter note editor form */}
                  <form onSubmit={handlePostNote} className="bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl p-3 flex flex-col gap-2 relative">
                    
                    {/* Mentions Dropdown */}
                    {showMentions && allowedTeamMembers && allowedTeamMembers.filter(m => {
                      const searchStr = mentionFilter.toLowerCase();
                      return m.name.toLowerCase().includes(searchStr) || 
                             (m.email && m.email.toLowerCase().includes(searchStr));
                    }).length > 0 && (
                      <div className="absolute bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                          Miembros del Equipo
                        </div>
                        {allowedTeamMembers.filter(m => {
                          const searchStr = mentionFilter.toLowerCase();
                          return m.name.toLowerCase().includes(searchStr) || 
                                 (m.email && m.email.toLowerCase().includes(searchStr));
                        }).map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => insertMention(member)}
                            className="w-full text-left px-3 py-2 text-xs text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[9px]">
                              {member.name?.substring(0, 2).toUpperCase()}
                            </span>
                            {member.name} ({member.role})
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <textarea 
                        ref={inputRef}
                        value={newNote} 
                        onChange={handleNoteChange}
                        onPaste={handlePaste}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribir nota o bitácora... (Ctrl+V para imágenes, Shift+Enter para nueva línea)" 
                        className="flex-1 bg-white border border-[#c6c6cd]/50 rounded-lg py-2 px-3 text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#eab308] resize-none h-16 scrollbar-thin"
                        disabled={isUploadingNote}
                      />
                      <button 
                        type="submit" 
                        disabled={(!newNote.trim() && pastedImages.length === 0) || isUploadingNote}
                        className="btn-gold-3d p-2 bg-[#eab308] text-white rounded-lg hover:bg-[#ca8a04] transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Send className={`w-3.5 h-3.5 ${isUploadingNote ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    {pastedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#c6c6cd]/20">
                        {pastedImages.map((file, idx) => (
                          <div key={idx} className="relative group w-14 h-14 rounded-lg border border-[#c6c6cd]/50 bg-white overflow-hidden">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Pasted ${idx}`} 
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePastedImage(idx)}
                              className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>

                  {/* Chronological Timeline feed */}
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {selectedLead.timeline.length === 0 ? (
                      <p className="text-xs text-[#7c839b] text-center py-6 font-medium">No hay eventos ni notas registradas.</p>
                    ) : (
                      selectedLead.timeline.map((ev) => (
                        <div key={ev.id} className="p-3.5 bg-[#f7f9fb] border border-[#c6c6cd]/20 rounded-xl flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-[#131b2e] font-bold text-[9px] flex items-center justify-center shrink-0 border mt-0.5">
                            {(ev.author || ev.title || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-sans text-xs font-bold text-[#131b2e]">{ev.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-[#7c839b]">{ev.timestamp}</span>
                                {onDeleteTimelineEvent && (ev.type === "note" || ev.id.startsWith("timeline-")) && (
                                  <button
                                    onClick={() => {
                                      if (confirm("¿Seguro que deseas eliminar este comentario?")) {
                                        onDeleteTimelineEvent(selectedLead.id, ev.id);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded"
                                    title="Eliminar comentario"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="font-sans text-xs text-[#45464d] leading-relaxed whitespace-pre-wrap">{ev.content}</p>
                            
                            {ev.duration && (
                              <span className="inline-block px-1.5 py-0.5 bg-white text-[#7c839b] text-[9px] rounded font-medium border border-[#c6c6cd]/20">Duración: {ev.duration}</span>
                            )}

                            {ev.photos && ev.photos.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {ev.photos.map((ph, idx) => (
                                  <div key={idx} className="relative group overflow-hidden rounded-lg w-16 h-16 border border-[#c6c6cd]/30 bg-slate-100">
                                    <img 
                                      src={ph} 
                                      alt={`Inspection ${idx}`} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                    />
                                  </div>
                                ))}
                                <div className="w-16 h-16 rounded-lg bg-[#eceef0] border border-dashed border-[#c6c6cd] flex items-center justify-center text-[#7c839b] text-xs font-bold shrink-0 cursor-pointer hover:bg-slate-100 transition-colors">
                                  +1
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}



              {activeTab === "documents" && (
                <div className="space-y-3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center justify-between p-3.5 bg-[#eceef0]/50 border border-[#c6c6cd]/30 border-dashed rounded-xl cursor-pointer transition-all text-center ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                  >
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                    <div className="mx-auto flex flex-col items-center">
                      <Upload className={`w-6 h-6 text-[#ca8a04] mb-1 ${isUploading ? 'animate-bounce' : ''}`} />
                      <span className="text-xs text-[#191c1e] font-semibold">
                        {isUploading ? "Subiendo archivo(s)..." : "Subir Archivo o Reporte Aéreo (EagleView)"}
                      </span>
                      <span className="text-[10px] text-[#7c839b]">Arrastra aquí o haz clic para examinar</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedLead.documents.length === 0 ? (
                      <p className="text-xs text-[#7c839b] text-center py-4 font-medium">No hay documentos cargados en el expediente.</p>
                    ) : (
                      selectedLead.documents.map((doc) => (
                        <div key={doc.id} onClick={() => window.open(doc.url, "_blank")} className="p-3 bg-white border border-[#c6c6cd]/30 rounded-xl flex items-center justify-between hover:bg-[#f7f9fb] transition-all cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-[#f2f4f6] text-[#ca8a04] flex items-center justify-center font-bold text-xs shrink-0 border">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-[#191c1e] block truncate max-w-[200px] hover:text-[#ca8a04] transition-colors">{doc.name}</span>
                              <span className="text-[10px] text-[#7c839b] font-medium block">{doc.size} • {doc.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={(e) => handleDownloadFile(e, doc)} className="text-xs text-[#ca8a04] font-bold hover:underline">Descargar</button>
                            {onDeleteDocument && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("¿Seguro que deseas eliminar este archivo de forma permanente?")) {
                                    onDeleteDocument(selectedLead.id, doc.id, doc.filePath);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar archivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "cash" && selectedLead && (
                <div className="p-5 bg-white border border-[#c6c6cd]/30 rounded-2xl shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eceef0] pb-3">
                    <div>
                      <h3 className="font-sans text-sm font-bold text-[#131b2e]">Llenar Datos del Reclamo</h3>
                      <p className="font-sans text-[10px] text-[#7c839b] font-medium font-sans">Ingrese los valores financieros del reclamo para calcular y revisar los profits.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-yellow-50 text-[#ca8a04] text-[10px] rounded-lg font-bold border border-yellow-200 font-sans">
                      FLUJO DE CAJA ACTIVO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1 */}
                    <div className="space-y-3.5">
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b pb-1 font-sans">Ingresos y Estimado de Seguro</h4>
                      {[
                        { key: "rcv", label: "RCV" },
                        { key: "acv", label: "ACV" },
                        { key: "deducible", label: "Deducible" },
                        { key: "depreciacion", label: "Depreciación" },
                        { key: "depreNoRecuperable", label: "Depre. no Recuperable" },
                        { key: "primerCheque", label: "Primer Cheque" },
                        { key: "segundoCheque", label: "Segundo Cheque" },
                        { key: "tercerCheque", label: "Tercer Cheque" },
                        { key: "suplemento1", label: "Suplemento 1" },
                        { key: "suplemento2", label: "Suplemento 2" },
                        { key: "suplemento3", label: "Suplemento 3" },
                      ].map((field) => (
                        <div key={field.key} className="flex items-center justify-between gap-4">
                          <label className="text-xs font-semibold text-slate-600 font-sans">{field.label}</label>
                          <div className="relative rounded-lg shadow-sm max-w-[180px] w-full">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                              <span className="text-slate-400 text-xs">$</span>
                            </div>
                            <input
                              type="text"
                              placeholder="0.00"
                              value={cashInputs[field.key] !== undefined ? cashInputs[field.key] : ""}
                              onChange={(e) => handleLocalCashChange(field.key, e.target.value)}
                              onBlur={saveCashData}
                              className="block w-full pl-6 pr-3 py-1.5 bg-white border border-[#c6c6cd]/50 rounded-lg text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#eab308] text-right font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-3.5">
                      <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider border-b pb-1 font-sans">Costos y Egresos de Obra</h4>
                      {[
                        { key: "valorMaterial", label: "Valor Material" },
                        { key: "valorLabor", label: "Valor Labor" },
                        { key: "valorTax", label: "Valor Tax" },
                        { key: "valorPermisos", label: "Valor Permisos" },
                        { key: "perdidaRepentina", label: "Pérdida Repentina" },
                      ].map((field) => (
                        <div key={field.key} className="flex items-center justify-between gap-4">
                          <label className="text-xs font-semibold text-slate-600 font-sans">{field.label}</label>
                          <div className="relative rounded-lg shadow-sm max-w-[180px] w-full">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                              <span className="text-slate-400 text-xs">$</span>
                            </div>
                            <input
                              type="text"
                              placeholder="0.00"
                              value={cashInputs[field.key] !== undefined ? cashInputs[field.key] : ""}
                              onChange={(e) => handleLocalCashChange(field.key, e.target.value)}
                              onBlur={saveCashData}
                              className="block w-full pl-6 pr-3 py-1.5 bg-white border border-[#c6c6cd]/50 rounded-lg text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#eab308] text-right font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Trigger Button */}
                  <div className="pt-4 border-t border-[#eceef0] flex justify-end">
                    <button
                      onClick={handleOpenProfits}
                      className="btn-gold-3d px-6 py-2.5 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 font-sans"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Revisar Profits</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="space-y-4">
                  {/* Enter new task input form */}
                  <form onSubmit={handleAddTaskSubmit} className="bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl p-3 flex flex-col sm:flex-row gap-2 items-center">
                    <input 
                      type="text" 
                      value={newTaskTitle} 
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Escribir nueva tarea..." 
                      className="flex-1 bg-white border border-[#c6c6cd]/50 rounded-lg py-2 px-3 text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#eab308] w-full"
                      disabled={isAddingTask}
                    />
                    <select
                      value={newTaskAssignedTo}
                      onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                      className="bg-white border border-[#c6c6cd]/50 rounded-lg py-2 px-2 text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#eab308] w-full sm:w-auto min-w-[140px]"
                      disabled={isAddingTask}
                    >
                      <option value="">Sin asignar</option>
                      {allowedTeamMembers.map((m) => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                    <button 
                      type="submit" 
                      disabled={!newTaskTitle.trim() || isAddingTask}
                      className="btn-gold-3d p-2 bg-[#eab308] text-slate-900 font-bold rounded-lg hover:bg-[#ca8a04] transition-colors disabled:opacity-50 shrink-0 w-full sm:w-auto flex items-center justify-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Tasks List Feed */}
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {selectedLead.tasks.length === 0 ? (
                      <p className="text-xs text-[#7c839b] text-center py-6 font-medium">No hay tareas asignadas en este reclamo.</p>
                    ) : (
                      selectedLead.tasks
                        .filter((task, idx, self) => self.findIndex(t => t.title?.trim().toLowerCase() === task.title?.trim().toLowerCase()) === idx)
                        .map((task) => {
                          const isComp = task.status === "completed";
                        return (
                          <div key={task.id} className="p-3.5 bg-[#f7f9fb] border border-[#c6c6cd]/20 rounded-xl flex items-center justify-between gap-3">
                            <div 
                              onClick={() => onToggleTask(selectedLead.id, task.id)}
                              className="flex items-center gap-3 cursor-pointer select-none flex-1"
                            >
                              {isComp ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#7c839b] shrink-0" />
                              )}
                              <div className="space-y-0.5 text-left">
                                <span className={`text-xs font-semibold leading-tight block ${isComp ? "line-through text-[#7c839b]" : "text-[#191c1e]"}`}>
                                  {task.title}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {task.dueDate && (
                                    <span className="text-[10px] text-[#7c839b]">Creado: {task.dueDate}</span>
                                  )}
                                  {task.assignedTo && (
                                    <span className="px-1.5 py-0.5 bg-[#ca8a04]/10 text-[#ca8a04] text-[8px] font-bold rounded font-sans">
                                      Asignado a: {task.assignedTo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {onDeleteTask && (
                              <button
                                onClick={() => {
                                  if (confirm("¿Seguro que deseas eliminar esta tarea?")) {
                                    onDeleteTask(selectedLead.id, task.id);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
      )}
    </div>
  );
}
