import React, { useState, useEffect, useRef } from "react";
import { eligibleCaseMembers } from "../lib/teamAccess.js";
import { Lead, TimelineEvent, DocumentItem, TeamMember } from "../types";
import { 
  Users, 
  MapPin, 
  Phone, 
  Building, 
  FileCheck2, 
  Plus, 
  CheckCircle2, 
  Home,
  FileText,
  Upload,
  Send,
  Trash2,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import ClaimFinances from "./ClaimFinances";
import { getKnownContactsForInsurance, getAllInsuranceCompanyNames } from "../data/insuranceDirectoryData";

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
  onAddLead: (lead: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => void;
  onUploadDocuments?: (leadId: string, files: File[], category?: string) => Promise<boolean>;
  onDeleteDocument?: (leadId: string, docId: string, filePath?: string) => Promise<boolean>;
  onUploadImageForTimeline?: (file: File) => Promise<string | null>;
  onDeleteTimelineEvent?: (leadId: string, eventId: string) => Promise<void> | void;
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
  openCreateFormOnEnter?: boolean;
  onCreateFormOpened?: () => void;
  onMoveProject?: (projectId: string, direction: "next" | "prev") => void;
  insuranceCompanies?: string[];
}

export default function LeadsView({
  leads,
  selectedLeadId,
  onSelectLead,
  onAddTimelineEvent,
  onAddLead,
  onUploadDocuments,
  onDeleteDocument,
  onUploadImageForTimeline,
  onDeleteTimelineEvent,
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
  openCreateFormOnEnter = false,
  onCreateFormOpened,
  onMoveProject,
  insuranceCompanies
}: LeadsViewProps) {
  const isAdminInsuranceView = userRole === "admin" && Boolean(isInsuranceView);
  const useContractorProfileStyle = userRole === "contractor" || isAdminInsuranceView;
  const dynamicInsuranceCompanies = React.useMemo(() => {
    if (insuranceCompanies && insuranceCompanies.length > 0) {
      return insuranceCompanies;
    }
    return getAllInsuranceCompanyNames(leads);
  }, [insuranceCompanies, leads]);

  const [activeTab, setActiveTab] = useState<"timeline" | "documents" | "finances">("timeline");
  const [newNote, setNewNote] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations]);
  const [isAddingLead, setIsAddingLead] = useState(false);

  useEffect(() => {
    if (!openCreateFormOnEnter) return;
    setIsAddingLead(true);
    onCreateFormOpened?.();
  }, [openCreateFormOnEnter, onCreateFormOpened]);

  // New Lead Form State
  const [leadName, setLeadName] = useState("");
  const [leadAddress, setLeadAddress] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSqft, setLeadSqft] = useState(2000);
  const [leadInsurance, setLeadInsurance] = useState("State Farm");
  const [leadAssignedRep, setLeadAssignedRep] = useState("");

  // Extra fields for Insurance View
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceDamage, setInsuranceDamage] = useState("Hail Damage");
  const [insuranceLossDate, setInsuranceLossDate] = useState("");
  const [insPhone1, setInsPhone1] = useState("");
  const [insEmail1, setInsEmail1] = useState("");

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
  const [editInsuranceNotes, setEditInsuranceNotes] = useState("");
  const [showExpressDirectoryModal, setShowExpressDirectoryModal] = useState<string | null>(null);

  // Smart Known Contacts for New Claim
  const newClaimKnownContacts = React.useMemo(() => {
    return getKnownContactsForInsurance(leadInsurance, leads);
  }, [leadInsurance, leads]);

  const handleAutofillNewClaim = () => {
    if (newClaimKnownContacts.phones[0] && !insPhone1) setInsPhone1(newClaimKnownContacts.phones[0]);
    if (newClaimKnownContacts.emails[0] && !insEmail1) setInsEmail1(newClaimKnownContacts.emails[0]);
  };

  // Smart Known Contacts for Edit Claim
  const editKnownContacts = React.useMemo(() => {
    return getKnownContactsForInsurance(editInsuranceProvider, leads);
  }, [editInsuranceProvider, leads]);

  const handleAutofillEditClaim = () => {
    if (editKnownContacts.phones[0] && !editInsurancePhone1) setEditInsurancePhone1(editKnownContacts.phones[0]);
    if (editKnownContacts.phones[1] && !editInsurancePhone2) setEditInsurancePhone2(editKnownContacts.phones[1]);
    if (editKnownContacts.emails[0] && !editInsuranceEmail1) setEditInsuranceEmail1(editKnownContacts.emails[0]);
    if (editKnownContacts.emails[1] && !editInsuranceEmail2) setEditInsuranceEmail2(editKnownContacts.emails[1]);
  };

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
    setEditInsuranceNotes(selectedLead.insuranceNotes || "");
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
      insuranceNotes: editInsuranceNotes,
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
  const [insuranceNotes, setInsuranceNotes] = useState("");

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
  const allowedTeamMembers = eligibleCaseMembers(teamMembers, selectedLead?.organizationId || activeOrganizationId);

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

    setActiveTab("timeline");
  }, [selectedLead?.id]);

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
  const [noteError, setNoteError] = useState('');
  const [mentionedMembers, setMentionedMembers] = useState<TeamMember[]>([]);
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
          <div className={`flex flex-col items-center justify-center rounded-3xl border p-12 text-center max-w-md shadow-sm ${isInsuranceView ? "bg-white border-[#E3E8ED]" : "bg-slate-800/40 border-slate-700/50"}`}>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isInsuranceView ? "bg-[#F5EAE1]" : "bg-blue-500/10"}`}>
              <Users className={`w-10 h-10 ${isInsuranceView ? "text-[#955B32]" : "text-blue-400"}`} />
            </div>
            <h2 className={`text-2xl font-bold mb-3 ${isInsuranceView ? "text-[#17314A]" : "text-white"}`}>No hay registros</h2>
            <p className={`mb-8 ${isInsuranceView ? "text-slate-500" : "text-slate-400"}`}>
              No se encontró ningún registro en la base de datos. Haz clic en el botón de abajo para empezar a registrar información real.
            </p>
            <button
              onClick={() => setIsAddingLead(true)}
              className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold transition-all shadow-lg ${isInsuranceView ? "bg-[#17314A] hover:bg-[#25435B]" : "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20"}`}
            >
              <Plus className="w-5 h-5" />
              {addButtonLabel || "Añadir Nuevo"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-[#F5F7F8]">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5 ${isInsuranceView ? "border-[#D8E0E6]" : "border-[#D8E0E6]/30"}`}>
          <div className="flex items-center gap-4">
            {isInsuranceView && (
              <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-[#17314A] to-[#25435B] shadow-md items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#E7C3A8]" strokeWidth={1.7} />
              </div>
            )}
            <div>
            {isInsuranceView && <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#955B32] mb-1">Gestión de expedientes</p>}
            <h1 className={`font-sans font-bold tracking-tight ${isInsuranceView ? "text-[28px] text-[#17314A]" : "text-[26px] text-[#17314A]"}`}>
              {viewTitle || "Carpeta de Leads & Clientes"}
            </h1>
            <p className="font-sans text-xs text-[#68798A] mt-1 font-medium">
              {viewSubtitle || "Cronologías de reclamos de seguros, visitas de peritos y archivos técnicos de propiedad."}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isInsuranceView && <span className="hidden md:inline-flex px-3 py-2 rounded-xl bg-white border border-[#E3E8ED] text-xs font-semibold text-slate-500">{filteredLeadsForSearch.length} expedientes</span>}
            <button
              onClick={() => setIsAddingLead(true)}
              className="btn-responsive btn-gold-3d px-4 py-2.5 bg-[#B77A4B] hover:bg-[#955B32] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              {addButtonLabel || "Crear Nuevo Lead"}
            </button>
          </div>
        </div>

        {/* Horizontal Case Cards List */}
        <div className={`space-y-3 mx-auto ${isInsuranceView ? "max-w-[1440px]" : "max-w-7xl"}`}>
          {/* Grid Column Headers for Desktop */}
          {filteredLeadsForSearch.length > 0 && (
            <div className={`hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold text-[#718093] uppercase tracking-[.12em] border-b mb-1 select-none ${isInsuranceView ? "border-[#D8E0E6]" : "border-[#E2E4EA]"}`}>
              {isInsuranceView ? (
                <>
                  <div className="col-span-3">Propietario</div>
                  <div className={isAdminInsuranceView ? "col-span-3" : "col-span-4"}>Propiedad</div>
                  <div className={isAdminInsuranceView ? "col-span-3" : "col-span-4"}>Aseguradora / claim</div>
                  {isAdminInsuranceView && <div className="col-span-2">Contratista</div>}
                  <div className="col-span-1 text-right">Actividad</div>
                </>
              ) : (
                <>
                  <div className="col-span-3">Cliente</div>
                  <div className="col-span-3">Dirección</div>
                  <div className="col-span-2">Claim</div>
                  <div className="col-span-2">Empresa</div>
                  <div className="col-span-1 text-center">Etapa</div>
                  <div className="col-span-1 text-right">Días</div>
                </>
              )}
            </div>
          )}

          {filteredLeadsForSearch.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#D8E0E6] rounded-2xl text-sm text-slate-500 font-semibold shadow-sm">
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
                  className={`${isInsuranceView ? "insurance-claim-card px-5 py-4 bg-white border border-[#E3E8ED] rounded-2xl" : `p-4 bg-white border border-[#E2E4EA] rounded-xl ${statusBorderClass}`} ambient-shadow-hover cursor-pointer transition-all duration-200 group`}
                >
                  {isInsuranceView ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#F5EAE1] text-[#955B32] flex items-center justify-center shrink-0">
                          <Home className="w-[18px] h-[18px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#17314A] truncate group-hover:text-[#955B32] transition-colors">{lead.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{lead.phone || "Sin teléfono registrado"}</p>
                        </div>
                      </div>

                      <div className={`${isAdminInsuranceView ? "lg:col-span-3" : "lg:col-span-4"} flex items-start gap-2 text-xs text-slate-600 min-w-0`}>
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#A77C5E]" />
                        <span className="leading-5 line-clamp-2">{lead.address || "Dirección pendiente"}</span>
                      </div>

                      <div className={`${isAdminInsuranceView ? "lg:col-span-3" : "lg:col-span-4"} flex items-start gap-2 min-w-0`}>
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#A77C5E]" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#33475B] truncate">{lead.insuranceProvider || "Aseguradora pendiente"}</p>
                          <p className="text-[11px] text-slate-400 truncate">Claim · {lead.claimNumber || "Por reclamar"}</p>
                        </div>
                      </div>

                      {isAdminInsuranceView && <div className="lg:col-span-2 min-w-0">
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#F3F6F8] px-2.5 py-1.5 text-xs font-semibold text-[#526477] truncate">
                          <Building className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{lead.company || "Xapcon Group"}</span>
                        </span>
                      </div>}

                      <div className="lg:col-span-1 flex lg:justify-end">
                        <span
                          title={`Sin actualización hace ${days} ${days === 1 ? "día" : "días"}`}
                          className={`inline-flex min-w-[64px] flex-col items-center rounded-xl px-2 py-1.5 ${days >= 7 ? "bg-rose-50 text-rose-700" : days >= 3 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                        >
                          <span className="text-sm font-bold leading-5">{days === 0 ? "Hoy" : `${days} d`}</span>
                          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{days >= 7 ? "Atención" : "Actualizado"}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Col 1: Icon + Client Name */}
                    <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#FEF3C7]">
                        <Home className="w-4 h-4 text-[#B8860B]" />
                      </div>
                      <span className="text-sm font-bold text-[#17314A] tracking-tight group-hover:text-[#B8860B] transition-colors truncate">
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
                      <span className="font-semibold text-[#17314A]">{lead.company || "Xapcon Group"}</span>
                    </div>

                    {/* Col 5: Etapa */}
                    <div className="lg:col-span-1 flex items-center lg:justify-center">
                      <span className="px-2.5 py-1 bg-[#B77A4B] text-[#17314A] text-[9px] rounded-md font-extrabold uppercase tracking-wider whitespace-nowrap shadow-sm">
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }
  
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
    setMentionedMembers((members) => members.filter((member) => {
      const firstName = member.name ? member.name.split(" ")[0] : "";
      return firstName && value.includes(`@${firstName}`);
    }));
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
    setMentionedMembers((members) => members.some((item) => item.id === member.id) ? members : [...members, member]);
    setShowMentions(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() && pastedImages.length === 0) return;
    
    setIsUploadingNote(true);
    setNoteError('');
    try {
      let uploadedUrls: string[] = [];
    
      if (pastedImages.length > 0 && onUploadImageForTimeline) {
        for (const file of pastedImages) {
          const url = await onUploadImageForTimeline(file);
          if (url) uploadedUrls.push(url);
        }
      }
    
      await onAddTimelineEvent(selectedLead.id, {
        type: "note",
        author: "", // The authenticated author is set by the server.
        title: "Nueva Nota Registrada",
        content: newNote.trim(),
        mentionedUserIds: mentionedMembers
          .filter((member) => {
            const firstName = member.name ? member.name.split(" ")[0] : "";
            return firstName && newNote.includes(`@${firstName}`);
          })
          .map((member) => member.id),
        photos: uploadedUrls.length > 0 ? uploadedUrls : undefined
      });
      setNewNote("");
      setMentionedMembers([]);
      setPastedImages([]);
    } catch (error) { setNoteError((error as Error).message || 'No se pudo guardar la nota.'); }
    finally { setIsUploadingNote(false); }

  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) return;
    
    onAddLead({
      name: leadName,
      status: "Nuevo",
      address: leadAddress || "No registrada",
      phone: leadPhone || "No registrado",
      email: leadEmail || "No registrado",
      propertyType: "Residential - Single Family",
      sqft: Number(leadSqft) || 1500,
      insuranceProvider: leadInsurance,
      claimNumber: isInsuranceView ? (insuranceClaimNumber || "Por reclamar") : "Por reclamar",
      policyNumber: isInsuranceView ? insurancePolicy : undefined,
      damageType: isInsuranceView ? insuranceDamage : undefined,
      lossDate: isInsuranceView ? insuranceLossDate : undefined,
      insurancePhone1: isInsuranceView ? insPhone1 : undefined,
      insuranceEmail1: isInsuranceView ? insEmail1 : undefined,
      notes: isInsuranceView ? homeownerNotes : undefined,
      insuranceNotes: isInsuranceView ? insuranceNotes : undefined,
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
    setLeadAssignedRep("");
    setInsurancePolicy("");
    setInsuranceDamage("Hail Damage");
    setInsuranceLossDate("");
    setInsPhone1("");
    setInsEmail1("");
    setInsuranceNotes("");
    setInsuranceClaimNumber("");
    setLeadAdjusterName("");
    setHomeownerNotes("");
    setIsAddingLead(false);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D8E0E6]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#17314A] tracking-tight">{viewTitle || "Carpeta de Leads & Clientes"}</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">{viewSubtitle || "Cronologías de reclamos de seguros, visitas de peritos y archivos técnicos de propiedad."}</p>
        </div>
        <button
          onClick={() => setIsAddingLead(!isAddingLead)}
          className="btn-responsive btn-gold-3d px-4 py-2 bg-[#B77A4B] hover:bg-[#955B32] text-slate-900 font-bold text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
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
              <div className="bg-white border border-[#D8E0E6]/30 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-sans text-sm font-bold text-[#17314A] border-b pb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-[#955B32] font-bold">1</span>
                    <span>Datos del Homeowner (Propietario)</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userRole === "admin" && organizations && organizations.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-[#955B32] mb-1">Empresa / Contratista Asignado</label>
                        <select 
                          value={selectedOrgId} 
                          onChange={(e) => setSelectedOrgId(e.target.value)}
                          className="w-full bg-white border border-[#D8E0E6]/80 rounded-lg p-2 text-xs text-[#191c1e] font-bold focus:border-[#B77A4B] outline-none cursor-pointer"
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
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
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
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 1</label>
                      <input 
                        type="text" 
                        value={leadPhone} 
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="(555) 012-3456" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 1</label>
                      <input 
                        type="email" 
                        value={leadEmail} 
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="ejemplo@correo.com" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre del Vendedor (Rep. Asignado)</label>
                      <input 
                        type="text" 
                        value={leadAssignedRep} 
                        onChange={(e) => setLeadAssignedRep(e.target.value)}
                        placeholder="Ej. Michael Chen" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nota (Observación Extra)</label>
                      <textarea 
                        value={homeownerNotes} 
                        onChange={(e) => setHomeownerNotes(e.target.value)}
                        placeholder="Escribe alguna observación o comentario extra del propietario..." 
                        rows={3}
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Card: Insurance Details */}
              <div className="bg-white border border-[#D8E0E6]/30 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-sans text-sm font-bold text-[#17314A] border-b pb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-[#955B32] font-bold">2</span>
                    <span>Datos de la Aseguradora</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-[#45464d]">Compañía de Seguros</label>
                        {(newClaimKnownContacts.emails.length > 0 || newClaimKnownContacts.phones.length > 0) && (
                          <button
                            type="button"
                            onClick={() => setShowExpressDirectoryModal(leadInsurance)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Ver Directorio ({newClaimKnownContacts.emails.length + newClaimKnownContacts.phones.length})</span>
                          </button>
                        )}
                      </div>
                      <select 
                        value={leadInsurance}
                        onChange={(e) => setLeadInsurance(e.target.value)}
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      >
                        {dynamicInsuranceCompanies.map((company) => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                      </select>

                      {(newClaimKnownContacts.emails.length > 0 || newClaimKnownContacts.phones.length > 0) && (
                        <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between gap-2">
                          <div className="text-[11px] text-blue-900 leading-tight min-w-0">
                            <span className="font-bold flex items-center gap-1 text-blue-800">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              Contactos conocidos para {leadInsurance}:
                            </span>
                            <span className="text-[10px] text-blue-700 block mt-0.5 truncate">
                              {newClaimKnownContacts.emails[0] || ""} {newClaimKnownContacts.phones[0] ? `• ${newClaimKnownContacts.phones[0]}` : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAutofillNewClaim}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors shrink-0 shadow-xs flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Autocompletar</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Número de Claim</label>
                      <input 
                        type="text" 
                        value={insuranceClaimNumber} 
                        onChange={(e) => setInsuranceClaimNumber(e.target.value)}
                        placeholder="Número de reclamación" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre Ajustador</label>
                      <input 
                        type="text" 
                        value={leadAdjusterName} 
                        onChange={(e) => setLeadAdjusterName(e.target.value)}
                        placeholder="Ej. John Doe" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Número de Póliza</label>
                      <input 
                        type="text" 
                        value={insurancePolicy} 
                        onChange={(e) => setInsurancePolicy(e.target.value)}
                        placeholder="Número de póliza" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Tipo de Daño</label>
                      <select 
                        value={insuranceDamage} 
                        onChange={(e) => setInsuranceDamage(e.target.value)}
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
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
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono Seguro 1</label>
                      <input 
                        type="text" 
                        value={insPhone1} 
                        onChange={(e) => setInsPhone1(e.target.value)}
                        placeholder="Teléfono primario" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Seguro 1</label>
                      <input 
                        type="email" 
                        value={insEmail1} 
                        onChange={(e) => setInsEmail1(e.target.value)}
                        placeholder="correo1@seguro.com" 
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nota (Observación Extra)</label>
                      <textarea
                        value={insuranceNotes}
                        onChange={(e) => setInsuranceNotes(e.target.value)}
                        placeholder="Escribe una observación o comentario sobre la aseguradora..."
                        rows={3}
                        className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          ) : (
            // Leads view - Single card
            <div className="bg-white border border-[#D8E0E6]/30 rounded-2xl p-6 shadow-sm space-y-4 max-w-2xl">
              <h3 className="font-sans text-sm font-bold text-[#17314A] border-b pb-2">{formTitle || "Ficha de Nuevo Prospecto de Cliente"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRole === "admin" && organizations && organizations.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#955B32] mb-1">Empresa / Contratista Asignado</label>
                    <select 
                      value={selectedOrgId} 
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="w-full bg-white border border-[#D8E0E6]/80 rounded-lg p-2 text-xs text-[#191c1e] font-bold focus:border-[#B77A4B] outline-none cursor-pointer"
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
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
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
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 1</label>
                  <input 
                    type="text" 
                    value={leadPhone} 
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="(555) 012-3456" 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 1</label>
                  <input 
                    type="email" 
                    value={leadEmail} 
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="ejemplo@correo.com" 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Superficie Estimada (SQFT)</label>
                  <input 
                    type="number" 
                    value={leadSqft} 
                    onChange={(e) => setLeadSqft(Number(e.target.value))}
                    placeholder="2000" 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Compañía de Seguros</label>
                  <select 
                    value={leadInsurance}
                    onChange={(e) => setLeadInsurance(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  >
                    {dynamicInsuranceCompanies.map((company) => (
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
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Action buttons (fixed/styled row) */}
          <div className={`flex justify-end gap-2 p-4 bg-white border border-[#D8E0E6]/30 rounded-2xl shadow-sm w-full ${isInsuranceView ? "" : "max-w-2xl"}`}>
            <button 
              type="button" 
              onClick={() => setIsAddingLead(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-responsive btn-gold-3d px-4 py-2 bg-[#B77A4B] text-slate-900 text-xs font-bold rounded-lg shadow-sm hover:bg-[#955B32] transition-colors"
            >
              {formSubmitLabel || "Registrar Prospecto"}
            </button>
          </div>
          
        </form>
      )}

      {/* Main Content Pane */}
      {selectedLead && (
        <div className="claim-case-layout grid grid-cols-1 xl:grid-cols-[310px_minmax(0,1fr)] gap-5 items-start">
        
        {/* Columna 2: Ficha Técnica (Dividida en 2 Cuadros: Homeowner e Información del Seguro) */}
        <div className="claim-case-sidebar flex flex-col gap-4">
          
          {/* CUADRO 1: Información del Homeowner */}
          <div className={`claim-profile-card bg-white border border-[#D8E0E6]/30 rounded-2xl p-4 shadow-sm flex flex-col space-y-3 ${useContractorProfileStyle ? "contractor-profile-card contractor-homeowner-card" : ""}`}>
            <div className="claim-profile-card-header flex items-center justify-between border-b border-gray-100 pb-2 w-full">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-[#B8860B]" />
                <h2 className="font-sans text-xs font-bold text-[#17314A]">Información del Homeowner</h2>
              </div>
              {!isEditingLead && onUpdateLead && (
                <button 
                  type="button"
                  onClick={handleStartEdit} 
                  className="text-[#955B32] hover:text-[#B77A4B] text-[10px] font-bold transition-colors cursor-pointer"
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
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dirección Física</label>
                  <input 
                    type="text" 
                    value={editAddress} 
                    onChange={(e) => setEditAddress(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono Principal</label>
                  <input 
                    type="text" 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={editEmail} 
                    onChange={(e) => setEditEmail(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vendedor (Rep. Asignado)</label>
                  <input 
                    type="text" 
                    value={editAssignedRep} 
                    onChange={(e) => setEditAssignedRep(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="claim-profile-data space-y-3 text-xs text-center">
                <div className={useContractorProfileStyle ? "contractor-profile-identity" : undefined}>
                  {useContractorProfileStyle && <span className="contractor-profile-mark"><Home aria-hidden="true" /></span>}
                  <span className="text-[#7c839b] font-medium block">Propietario</span>
                  <span className="text-[#17314A] font-bold block">{selectedLead.name}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Dirección</span>
                  <span className="text-[#17314A] font-bold block">{selectedLead.address || "Sin dirección"}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Teléfono Principal</span>
                  <span className="text-[#17314A] font-bold block">{selectedLead.phone || "No registrado"}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Correo Electrónico</span>
                  <span className="text-[#17314A] font-bold block truncate">{selectedLead.email || "No registrado"}</span>
                </div>
                {selectedLead.assignedRep && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Rep. Asignado</span>
                    <span className="text-[#17314A] font-bold block">{selectedLead.assignedRep}</span>
                  </div>
                )}
                {selectedLead.notes && (
                  <div className="claim-profile-note bg-[#f2f4f6]/60 border border-[#D8E0E6]/30 rounded-xl p-3 mt-1">
                    <span className="text-[#7c839b] font-bold block text-[10px] uppercase mb-1">Notas</span>
                    <p className="text-[#191c1e] text-xs leading-relaxed font-medium italic text-center">"{selectedLead.notes}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CUADRO 2: Información del Seguro */}
          <div className={`claim-profile-card bg-white border border-[#D8E0E6]/30 rounded-2xl p-4 shadow-sm flex flex-col space-y-3 ${useContractorProfileStyle ? "contractor-profile-card contractor-insurance-card" : ""}`}>
            <div className="claim-profile-card-header flex items-center justify-between border-b border-gray-100 pb-2 w-full">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <h2 className="font-sans text-xs font-bold text-[#17314A]">Información del Seguro</h2>
              </div>
            </div>

            {isEditingLead ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Compañía de Seguros</label>
                    {(editKnownContacts.emails.length > 0 || editKnownContacts.phones.length > 0) && (
                      <button
                        type="button"
                        onClick={() => setShowExpressDirectoryModal(editInsuranceProvider)}
                        className="text-[9px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        <span>Directorio ({editKnownContacts.emails.length + editKnownContacts.phones.length})</span>
                      </button>
                    )}
                  </div>
                  <select 
                    value={editInsuranceProvider} 
                    onChange={(e) => setEditInsuranceProvider(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  >
                    {dynamicInsuranceCompanies.map(company => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>

                  {(editKnownContacts.emails.length > 0 || editKnownContacts.phones.length > 0) && (
                    <div className="mt-2 p-2 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between gap-2">
                      <div className="text-[10px] text-blue-900 leading-tight min-w-0">
                        <span className="font-bold flex items-center gap-1 text-blue-800 text-[10px]">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          Datos disponibles:
                        </span>
                        <span className="text-[9px] text-blue-700 block truncate max-w-[130px]">
                          {editKnownContacts.emails[0] || editKnownContacts.phones[0]}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutofillEditClaim}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded-lg transition-colors shrink-0 shadow-xs flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Rellenar</span>
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Número de Claim</label>
                  <input 
                    type="text" 
                    value={editClaimNumber} 
                    onChange={(e) => setEditClaimNumber(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Número de Póliza</label>
                  <input 
                    type="text" 
                    value={editPolicyNumber} 
                    onChange={(e) => setEditPolicyNumber(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Daño</label>
                  <select 
                    value={editDamageType} 
                    onChange={(e) => setEditDamageType(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
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
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Perito / Ajustador</label>
                  <input 
                    type="text" 
                    value={editAdjusterName} 
                    onChange={(e) => setEditAdjusterName(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono Seguro 1</label>
                  <input 
                    type="text" 
                    value={editInsurancePhone1} 
                    onChange={(e) => setEditInsurancePhone1(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Seguro 1</label>
                  <input 
                    type="email" 
                    value={editInsuranceEmail1} 
                    onChange={(e) => setEditInsuranceEmail1(e.target.value)} 
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nota de la Aseguradora</label>
                  <textarea
                    value={editInsuranceNotes}
                    onChange={(e) => setEditInsuranceNotes(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#B77A4B] outline-none resize-none"
                    rows={3}
                  />
                </div>

                <div className="pt-3 border-t border-[#D8E0E6]/30 flex flex-col gap-2">
                  <button 
                    type="button"
                    onClick={handleSaveEdit} 
                    className="btn-gold-3d w-full text-center py-2 bg-[#B77A4B] hover:bg-[#955B32] text-slate-900 font-bold text-xs rounded-lg transition-colors cursor-pointer"
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
              <div className="claim-profile-data space-y-3 text-xs text-center">
                <div className={useContractorProfileStyle ? "contractor-profile-identity" : undefined}>
                  {useContractorProfileStyle && <span className="contractor-profile-mark"><ShieldCheck aria-hidden="true" /></span>}
                  <span className="text-[#7c839b] font-medium block">Aseguradora</span>
                  <span className="text-[#17314A] font-bold block">{selectedLead.insuranceProvider || "No especificada"}</span>
                </div>
                <div>
                  <span className="text-[#7c839b] font-medium block">Número de Claim</span>
                  <span className="text-[#17314A] font-bold block">{selectedLead.claimNumber || "Sin claim"}</span>
                </div>
                {selectedLead.policyNumber && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Número de Póliza</span>
                    <span className="text-[#17314A] font-bold block">{selectedLead.policyNumber}</span>
                  </div>
                )}
                {selectedLead.damageType && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Tipo de Daño</span>
                    <span className="text-[#17314A] font-bold block">{selectedLead.damageType}</span>
                  </div>
                )}
                {selectedLead.lossDate && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Fecha de Pérdida</span>
                    <span className="text-[#17314A] font-bold block">{selectedLead.lossDate}</span>
                  </div>
                )}
                {selectedLead.adjusterName && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Perito / Ajustador</span>
                    <span className="text-[#17314A] font-bold block">{selectedLead.adjusterName}</span>
                  </div>
                )}
                {selectedLead.insurancePhone1 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Teléfono Seguro 1</span>
                    <span className="text-[#17314A] font-bold block">{selectedLead.insurancePhone1}</span>
                  </div>
                )}
                {selectedLead.insuranceEmail1 && (
                  <div>
                    <span className="text-[#7c839b] font-medium block">Correo Seguro 1</span>
                    <span className="text-[#17314A] font-bold block truncate">{selectedLead.insuranceEmail1}</span>
                  </div>
                )}
                {selectedLead.insuranceNotes && (
                  <div className="claim-profile-note">
                    <span className="text-[#7c839b] font-bold block text-[10px] uppercase mb-1">Nota de la Aseguradora</span>
                    <p className="text-[#191c1e] text-xs leading-relaxed font-medium italic">"{selectedLead.insuranceNotes}"</p>
                  </div>
                )}

                <div className="pt-3 border-t border-[#D8E0E6]/30 flex flex-col gap-2">
                  <button className="btn-gold-3d w-full text-center py-2 bg-[#B77A4B] hover:bg-[#955B32] text-slate-900 font-bold text-xs rounded-lg transition-colors cursor-pointer">
                    Escribir Correo a Ajustador
                  </button>
                  <button className="btn-gold-3d w-full text-center py-2 bg-[#B77A4B] hover:bg-[#955B32] text-slate-900 font-bold text-xs rounded-lg transition-colors cursor-pointer">
                    Escribir Correo al HO
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Columna 3: Expediente Completo */}
        <div className="claim-workspace bg-white border border-[#D8E0E6]/30 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          
          {/* Header Metadata of Selected Lead */}
          <div className="claim-case-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#EEF1F3] pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectLead("")}
                className="claim-case-back mr-2 p-2 border border-[#D8E0E6]/30 rounded-xl hover:bg-slate-50 text-gray-500 hover:text-gray-700 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm"
                title="Volver al listado"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
              <div className="claim-case-icon w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B77A4B] to-[#955B32] shadow-lg shadow-[#B77A4B]/30 border border-white/20 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6 text-white drop-shadow-md" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-sans text-xl font-bold text-[#17314A] leading-tight flex items-center flex-wrap gap-2">
                  <span>{selectedLead.name}</span>
                  {selectedLead.claimNumber && selectedLead.claimNumber !== "Por reclamar" && selectedLead.claimNumber !== "Pending" && (
                    <span className="claim-number-badge px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-bold border border-blue-200 shadow-sm">
                      Claim: {selectedLead.claimNumber}
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-[#7c839b] font-medium">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#955B32]" /> {selectedLead.address}</span>
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
              <div className="claim-stage-controls flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleStageMove("prev")}
                  disabled={selectedLead.status === "Negados"}
                  className="claim-stage-back px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 shadow-sm active:scale-95 cursor-pointer"
                  title="Retroceder a la etapa anterior en el Kanban"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Retroceder</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStageMove("next")}
                  disabled={selectedLead.status === "Cancelado"}
                  className="claim-stage-next px-3 py-1.5 bg-[#B77A4B] hover:bg-[#955B32] disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                  title="Avanzar a la siguiente etapa en el Kanban"
                >
                  <span>Avanzar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Control */}
          <div className="claim-tabs flex border-b border-[#EEF1F3] pb-1.5 gap-4">
            {["timeline", "documents", "finances"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                aria-selected={activeTab === tab}
                className={`font-sans text-xs font-semibold pb-1 border-b-2 transition-all ${
                  activeTab === tab
                    ? "border-[#B77A4B] text-[#17314A] font-bold"
                    : "border-transparent text-[#7c839b] hover:text-[#17314A]"
                }`}
              >
                {tab === "timeline" ? "Línea de Tiempo" : tab === "documents" ? "Documentos" : "Finanzas"}
              </button>
            ))}
          </div>

          {/* Tab content panel */}
          <div className="claim-tab-content w-full space-y-4">
              
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  
                  {/* Enter note editor form */}
                  <form onSubmit={handlePostNote} className="claim-note-composer bg-[#F5F7F8] border border-[#D8E0E6]/30 rounded-xl p-3 flex flex-col gap-2 relative">
                    
                    {/* Mentions Dropdown */}
                    {noteError && <p role="alert" className="text-xs text-red-600">{noteError}</p>}
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
                        className="flex-1 bg-white border border-[#D8E0E6]/50 rounded-lg py-2 px-3 text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#B77A4B] resize-none h-16 scrollbar-thin"
                        disabled={isUploadingNote}
                      />
                      <button 
                        type="submit" 
                        disabled={(!newNote.trim() && pastedImages.length === 0) || isUploadingNote}
                        className="btn-gold-3d p-2 bg-[#B77A4B] text-white rounded-lg hover:bg-[#955B32] transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Send className={`w-3.5 h-3.5 ${isUploadingNote ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    {pastedImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#D8E0E6]/20">
                        {pastedImages.map((file, idx) => (
                          <div key={idx} className="relative group w-14 h-14 rounded-lg border border-[#D8E0E6]/50 bg-white overflow-hidden">
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
                        <div key={ev.id} className="claim-timeline-entry p-3.5 bg-[#F5F7F8] border border-[#D8E0E6]/20 rounded-xl flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-[#17314A] font-bold text-[9px] flex items-center justify-center shrink-0 border mt-0.5">
                            {(ev.author || ev.title || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-sans text-xs font-bold text-[#17314A]">{ev.title}</span>
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
                              <span className="inline-block px-1.5 py-0.5 bg-white text-[#7c839b] text-[9px] rounded font-medium border border-[#D8E0E6]/20">Duración: {ev.duration}</span>
                            )}

                            {ev.photos && ev.photos.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {ev.photos.map((ph, idx) => (
                                  <div key={idx} className="relative group overflow-hidden rounded-lg w-16 h-16 border border-[#D8E0E6]/30 bg-slate-100">
                                    <img 
                                      src={ph} 
                                      alt={`Inspection ${idx}`} 
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                    />
                                  </div>
                                ))}
                                <div className="w-16 h-16 rounded-lg bg-[#EEF1F3] border border-dashed border-[#D8E0E6] flex items-center justify-center text-[#7c839b] text-xs font-bold shrink-0 cursor-pointer hover:bg-slate-100 transition-colors">
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
                <div className="claim-document-panel space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`claim-document-upload flex items-center justify-between p-3.5 bg-[#EEF1F3]/50 border border-[#D8E0E6]/30 border-dashed rounded-xl cursor-pointer transition-all text-center ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                  >
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                    <div className="claim-document-upload-copy mx-auto flex flex-col items-center">
                      <span className="claim-document-upload-icon"><Upload className={`w-5 h-5 text-[#955B32] ${isUploading ? 'animate-bounce' : ''}`} /></span>
                      <span className="text-xs text-[#191c1e] font-semibold">
                        {isUploading ? "Subiendo archivo(s)..." : "Subir Archivo o Reporte Aéreo (EagleView)"}
                      </span>
                      <span className="text-[10px] text-[#7c839b]">Arrastra aquí o haz clic para examinar</span>
                    </div>
                  </div>

                  <div className="claim-document-list space-y-2">
                    {selectedLead.documents.length === 0 ? (
                      <div className="claim-document-empty"><FileText className="w-5 h-5" /><p>No hay documentos cargados en el expediente.</p></div>
                    ) : (
                      selectedLead.documents.map((doc) => (
                        <div key={doc.id} onClick={() => window.open(doc.url, "_blank")} className="claim-document-item p-3 bg-white border border-[#D8E0E6]/30 rounded-xl flex items-center justify-between hover:bg-[#F5F7F8] transition-all cursor-pointer">
                          <div className="claim-document-details flex items-center gap-2.5">
                            <div className="claim-document-icon w-8 h-8 rounded bg-[#f2f4f6] text-[#955B32] flex items-center justify-center font-bold text-xs shrink-0 border">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="claim-document-name space-y-0.5">
                              <span className="text-xs font-bold text-[#191c1e] block truncate max-w-[200px] hover:text-[#955B32] transition-colors">{doc.name}</span>
                              <span className="text-[10px] text-[#7c839b] font-medium block">{doc.size} • {doc.category}</span>
                            </div>
                          </div>
                          <div className="claim-document-actions flex items-center gap-3">
                            <button onClick={(e) => handleDownloadFile(e, doc)} className="claim-document-download text-xs text-[#955B32] font-bold hover:underline">Descargar</button>
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

              {activeTab === "finances" && selectedLead && (
                <ClaimFinances claimId={selectedLead.id} organizationId={selectedLead.organizationId || activeOrganizationId} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Express Directory Modal for fast copy / insert */}
      {showExpressDirectoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#17314A] text-[#B77A4B] flex items-center justify-center font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#17314A]">{showExpressDirectoryModal}</h3>
                  <p className="text-[10px] text-slate-400">Directorio rápido de contactos conocidos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExpressDirectoryModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {(() => {
              const info = getKnownContactsForInsurance(showExpressDirectoryModal, leads);
              return (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Correos de Reclamos Disponibles:
                    </span>
                    {info.emails.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay correos registrados para esta aseguradora.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {info.emails.map(email => (
                          <div key={email} className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-slate-800 truncate">{email}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingLead) setEditInsuranceEmail1(email);
                                  else setInsEmail1(email);
                                  setShowExpressDirectoryModal(null);
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Usar como Correo 1
                              </button>
                              {isEditingLead && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditInsuranceEmail2(email);
                                    setShowExpressDirectoryModal(null);
                                  }}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Correo 2
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Teléfonos Disponibles:
                    </span>
                    {info.phones.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay teléfonos registrados para esta aseguradora.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {info.phones.map(phone => (
                          <div key={phone} className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-slate-800">{phone}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditingLead) setEditInsurancePhone1(phone);
                                  else setInsPhone1(phone);
                                  setShowExpressDirectoryModal(null);
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Usar Teléfono 1
                              </button>
                              {isEditingLead && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditInsurancePhone2(phone);
                                    setShowExpressDirectoryModal(null);
                                  }}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  Teléfono 2
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExpressDirectoryModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
