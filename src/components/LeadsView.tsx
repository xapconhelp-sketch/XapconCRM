import React, { useState } from "react";
import { Lead, TimelineEvent, TaskItem, DocumentItem } from "../types";
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
  FileText,
  FileSignature,
  FileImage,
  Upload,
  Clock,
  Send,
  MessageSquare,
  Bot
} from "lucide-react";

const INSURANCE_COMPANIES = [
  "State Farm",
  "Allstate",
  "USAA",
  "Liberty Mutual",
  "Farmers Insurance",
  "Travelers",
  "American Family Insurance",
  "Nationwide",
  "Chubb",
  "Progressive",
  "Amica Mutual",
  "Erie Insurance",
  "Auto-Owners Insurance",
  "Cincinnati Financial",
  "Auto Club Enterprises (AAA)",
  "Kemper",
  "Mercury Insurance",
  "Saffeco Insurance",
  "The Hartford",
  "Chubb."
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
  onAddTimelineEvent: (leadId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => void;
  onToggleTask: (leadId: string, taskId: string) => void;
  onAddLead: (lead: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => void;
  viewTitle?: string;
  viewSubtitle?: string;
  addButtonLabel?: string;
  formTitle?: string;
  formSubmitLabel?: string;
  isInsuranceView?: boolean;
}

export default function LeadsView({
  leads,
  selectedLeadId,
  onSelectLead,
  onAddTimelineEvent,
  onToggleTask,
  onAddLead,
  viewTitle,
  viewSubtitle,
  addButtonLabel,
  formTitle,
  formSubmitLabel,
  isInsuranceView
}: LeadsViewProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "insurance" | "documents" | "production">("timeline");
  const [newNote, setNewNote] = useState("");
  const [isAddingLead, setIsAddingLead] = useState(false);
  
  // New Lead Form State
  const [leadName, setLeadName] = useState("");
  const [leadAddress, setLeadAddress] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSqft, setLeadSqft] = useState(2000);
  const [leadInsurance, setLeadInsurance] = useState("State Farm");

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
  const [insuranceClaimNumber, setInsuranceClaimNumber] = useState("");
  const [homeownerNotes, setHomeownerNotes] = useState("");

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddTimelineEvent(selectedLead.id, {
      type: "note",
      author: "Michael Chen", // Current user
      title: "Nueva Nota Registrada",
      content: newNote.trim()
    });
    setNewNote("");
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
      adjusterName: "Por asignar",
      assignedRep: "Michael Chen",
      assignedRepAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA3-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC"
    });

    // Reset
    setLeadName("");
    setLeadAddress("");
    setLeadPhone("");
    setLeadEmail("");
    setLeadPhone2("");
    setLeadEmail2("");
    setInsurancePolicy("");
    setInsuranceDamage("Hail Damage");
    setInsuranceLossDate("");
    setInsPhone1("");
    setInsPhone2("");
    setInsEmail1("");
    setInsEmail2("");
    setInsuranceClaimNumber("");
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
          className="px-4 py-2 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
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
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-[#006c49] font-bold">1</span>
                    <span>Datos del Homeowner (Propietario)</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={leadName} 
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="Nombre del propietario" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
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
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 1</label>
                      <input 
                        type="text" 
                        value={leadPhone} 
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="(555) 012-3456" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 1</label>
                      <input 
                        type="email" 
                        value={leadEmail} 
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="ejemplo@correo.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 2</label>
                      <input 
                        type="text" 
                        value={leadPhone2} 
                        onChange={(e) => setLeadPhone2(e.target.value)}
                        placeholder="Segundo teléfono" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 2</label>
                      <input 
                        type="email" 
                        value={leadEmail2} 
                        onChange={(e) => setLeadEmail2(e.target.value)}
                        placeholder="segundo@correo.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nota (Observación Extra)</label>
                      <textarea 
                        value={homeownerNotes} 
                        onChange={(e) => setHomeownerNotes(e.target.value)}
                        placeholder="Escribe alguna observación o comentario extra del propietario..." 
                        rows={3}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Card: Insurance Details */}
              <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-sans text-sm font-bold text-[#131b2e] border-b pb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs text-[#006c49] font-bold">2</span>
                    <span>Datos de la Aseguradora</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Compañía de Seguros</label>
                      <select 
                        value={leadInsurance}
                        onChange={(e) => setLeadInsurance(e.target.value)}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
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
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Número de Póliza</label>
                      <input 
                        type="text" 
                        value={insurancePolicy} 
                        onChange={(e) => setInsurancePolicy(e.target.value)}
                        placeholder="Número de póliza" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Tipo de Daño</label>
                      <select 
                        value={insuranceDamage} 
                        onChange={(e) => setInsuranceDamage(e.target.value)}
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
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
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono Seguro 1</label>
                      <input 
                        type="text" 
                        value={insPhone1} 
                        onChange={(e) => setInsPhone1(e.target.value)}
                        placeholder="Teléfono primario" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono Seguro 2</label>
                      <input 
                        type="text" 
                        value={insPhone2} 
                        onChange={(e) => setInsPhone2(e.target.value)}
                        placeholder="Teléfono secundario" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Seguro 1</label>
                      <input 
                        type="email" 
                        value={insEmail1} 
                        onChange={(e) => setInsEmail1(e.target.value)}
                        placeholder="correo1@seguro.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Seguro 2</label>
                      <input 
                        type="email" 
                        value={insEmail2} 
                        onChange={(e) => setInsEmail2(e.target.value)}
                        placeholder="correo2@seguro.com" 
                        className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
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
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={leadName} 
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Nombre del propietario" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
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
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Teléfono de Contacto 1</label>
                  <input 
                    type="text" 
                    value={leadPhone} 
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="(555) 012-3456" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Correo Electrónico 1</label>
                  <input 
                    type="email" 
                    value={leadEmail} 
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="ejemplo@correo.com" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Superficie Estimada (SQFT)</label>
                  <input 
                    type="number" 
                    value={leadSqft} 
                    onChange={(e) => setLeadSqft(Number(e.target.value))}
                    placeholder="2000" 
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#45464d] mb-1">Compañía de Seguros</label>
                  <select 
                    value={leadInsurance}
                    onChange={(e) => setLeadInsurance(e.target.value)}
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none"
                  >
                    {INSURANCE_COMPANIES.map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                  </select>
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
              className="px-4 py-2 bg-[#006c49] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#005236] transition-colors"
            >
              {formSubmitLabel || "Registrar Prospecto"}
            </button>
          </div>
          
        </form>
      )}

      {/* Main Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Leads list sidebar */}
        <div className="lg:col-span-3 bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-1">
            <h2 className="font-sans text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#006c49]" />
              <span>Directorio Activo ({leads.length})</span>
            </h2>
          </div>
          
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {leads.map((l) => {
              const isSelected = l.id === selectedLeadId;
              return (
                <div
                  key={l.id}
                  onClick={() => onSelectLead(l.id)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? "bg-[#6cf8bb]/15 border-[#6cf8bb] shadow-sm font-bold"
                      : "bg-white border-[#c6c6cd]/30 hover:bg-[#f7f9fb]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-xs font-bold text-[#131b2e]">{l.name}</span>
                    <span className="font-mono text-[9px] font-bold text-[#7c839b]">{l.id}</span>
                  </div>
                  <p className="font-sans text-[11px] text-[#45464d] truncate mt-1">{l.address}</p>
                  
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="font-sans text-[10px] text-[#7c839b]">{l.propertyType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      l.status === "Inspección Completada" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {l.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Lead Client Folder File details */}
        <div className="lg:col-span-9 bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm flex flex-col space-y-6">
          
          {/* Header Metadata of Selected Lead */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#eceef0] pb-4">
            <div className="flex items-center gap-3">
              <img 
                src={selectedLead.assignedRepAvatar} 
                alt={selectedLead.assignedRep} 
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full border border-[#c6c6cd]/40 bg-gray-50 object-cover"
              />
              <div>
                <h2 className="font-sans text-lg font-bold text-[#131b2e] leading-tight flex items-center gap-2">
                  <span>{selectedLead.name}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-[#45464d] text-[10px] rounded font-medium border border-[#c6c6cd]/30 font-mono">{selectedLead.id}</span>
                </h2>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-[#7c839b] font-medium">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#006c49]" /> {selectedLead.address}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedLead.phone}</span>
                </div>
              </div>
            </div>
            
            <div className="text-left md:text-right">
              <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Rep. Asignado</span>
              <span className="text-xs text-[#131b2e] font-bold block">{selectedLead.assignedRep}</span>
              <span className="text-[10px] text-[#7c839b] font-medium block">Alta: {selectedLead.createdAt}</span>
            </div>
          </div>

          {/* Tab Control */}
          <div className="flex border-b border-[#eceef0] pb-1.5 gap-4">
            {["timeline", "insurance", "documents", "production"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`font-sans text-xs font-semibold pb-1 border-b-2 transition-all ${
                  activeTab === tab
                    ? "border-[#006c49] text-[#131b2e] font-bold"
                    : "border-transparent text-[#7c839b] hover:text-[#131b2e]"
                }`}
              >
                {tab === "timeline" ? "Línea de Tiempo" : tab === "insurance" ? "Seguro / Claim" : tab === "documents" ? "Documentos" : "Producción"}
              </button>
            ))}
          </div>

          {/* Grid of Tab content + Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Tab panel: Left 8-cols */}
            <div className="md:col-span-8 space-y-4">
              
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  
                  {/* Enter note editor form */}
                  <form onSubmit={handlePostNote} className="bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl p-3 flex gap-2 items-center">
                    <input 
                      type="text" 
                      value={newNote} 
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escribir nota o bitácora de peritaje..." 
                      className="flex-1 bg-white border border-[#c6c6cd]/50 rounded-lg py-2 px-3 text-xs text-[#191c1e] outline-none focus:ring-1 focus:ring-[#006c49]"
                    />
                    <button 
                      type="submit" 
                      disabled={!newNote.trim()}
                      className="p-2 bg-[#006c49] text-white rounded-lg hover:bg-[#005236] transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Chronological Timeline feed */}
                  <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                    {selectedLead.timeline.length === 0 ? (
                      <p className="text-xs text-[#7c839b] text-center py-6 font-medium">No hay eventos ni notas registradas.</p>
                    ) : (
                      selectedLead.timeline.map((ev) => (
                        <div key={ev.id} className="p-3.5 bg-[#f7f9fb] border border-[#c6c6cd]/20 rounded-xl flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-[#131b2e] font-bold text-[9px] flex items-center justify-center shrink-0 border mt-0.5">
                            {ev.author.charAt(0)}
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-sans text-xs font-bold text-[#131b2e]">{ev.title}</span>
                              <span className="font-mono text-[9px] text-[#7c839b]">{ev.timestamp}</span>
                            </div>
                            <p className="font-sans text-xs text-[#45464d] leading-relaxed">{ev.content}</p>
                            
                            {ev.duration && (
                              <span className="inline-block px-1.5 py-0.5 bg-white text-[#7c839b] text-[9px] font-mono rounded font-medium border border-[#c6c6cd]/20">Duración: {ev.duration}</span>
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

              {activeTab === "insurance" && (
                <div className="p-4 bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                    <h3 className="font-sans text-xs font-bold text-[#131b2e]">Póliza & Datos de Compañía Afectada</h3>
                    <span className="px-2 py-0.5 bg-slate-200 text-[#45464d] text-[9px] rounded font-mono font-bold">Claim # {selectedLead.claimNumber}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[#7c839b] font-medium block">Aseguradora</span>
                      <span className="text-[#131b2e] font-bold block">{selectedLead.insuranceProvider}</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block">Número de Claim</span>
                      <span className="text-[#131b2e] font-bold block">{selectedLead.claimNumber}</span>
                    </div>
                    {selectedLead.policyNumber && (
                      <div>
                        <span className="text-[#7c839b] font-medium block">Número de Póliza</span>
                        <span className="text-[#131b2e] font-bold block font-mono">{selectedLead.policyNumber}</span>
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
                        <span className="text-[#131b2e] font-bold block font-mono">{selectedLead.lossDate}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#7c839b] font-medium block">Perito / Ajustador</span>
                      <span className="text-[#131b2e] font-bold block">{selectedLead.adjusterName}</span>
                    </div>
                    {selectedLead.insurancePhone1 && (
                      <div>
                        <span className="text-[#7c839b] font-medium block">Teléfono Seguro 1</span>
                        <span className="text-[#131b2e] font-bold block font-mono">{selectedLead.insurancePhone1}</span>
                      </div>
                    )}
                    {selectedLead.insurancePhone2 && (
                      <div>
                        <span className="text-[#7c839b] font-medium block">Teléfono Seguro 2</span>
                        <span className="text-[#131b2e] font-bold block font-mono">{selectedLead.insurancePhone2}</span>
                      </div>
                    )}
                    {selectedLead.insuranceEmail1 && (
                      <div>
                        <span className="text-[#7c839b] font-medium block">Correo Seguro 1</span>
                        <span className="text-[#131b2e] font-bold block truncate">{selectedLead.insuranceEmail1}</span>
                      </div>
                    )}
                    {selectedLead.insuranceEmail2 && (
                      <div className="sm:col-span-2">
                        <span className="text-[#7c839b] font-medium block">Correo Seguro 2</span>
                        <span className="text-[#131b2e] font-bold block truncate">{selectedLead.insuranceEmail2}</span>
                      </div>
                    )}
                    {!isInsuranceView && (
                      <div>
                        <span className="text-[#7c839b] font-medium block">Superficie de Techo</span>
                        <span className="text-[#131b2e] font-bold block">{selectedLead.sqft} SQFT (~{(selectedLead.sqft / 100).toFixed(1)} SQ)</span>
                      </div>
                    )}
                  </div>

                  {/* Also show Homeowner contact 2 and Notes if they exist */}
                  {(selectedLead.phone2 || selectedLead.email2 || selectedLead.notes) && (
                    <div className="pt-3 border-t border-dashed border-[#c6c6cd]/30 space-y-2">
                      <h4 className="font-sans text-[10px] font-bold text-[#131b2e] uppercase">Información Adicional del Homeowner</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {selectedLead.phone2 && (
                          <div>
                            <span className="text-[#7c839b] font-medium block">Teléfono de Contacto 2</span>
                            <span className="text-[#131b2e] font-bold block font-mono">{selectedLead.phone2}</span>
                          </div>
                        )}
                        {selectedLead.email2 && (
                          <div>
                            <span className="text-[#7c839b] font-medium block">Correo Electrónico 2</span>
                            <span className="text-[#131b2e] font-bold block">{selectedLead.email2}</span>
                          </div>
                        )}
                        {selectedLead.notes && (
                          <div className="col-span-2 bg-[#f2f4f6]/60 border border-[#c6c6cd]/30 rounded-xl p-3 mt-1">
                            <span className="text-[#7c839b] font-bold block text-[10px] uppercase mb-1">Notas / Observaciones del Propietario</span>
                            <p className="text-[#191c1e] text-xs leading-relaxed font-medium italic">"{selectedLead.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t flex flex-col gap-2">
                    <button className="w-full text-center py-2 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-bold rounded-lg transition-colors">
                      Escribir Correo Formal a Ajustador
                    </button>
                    <button className="w-full text-center py-2 bg-white border border-[#c6c6cd]/60 hover:bg-[#eceef0] text-[#191c1e] text-xs font-semibold rounded-lg transition-colors">
                      Subir Reporte Pericial del Seguro (XML/PDF)
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-[#eceef0]/50 border border-[#c6c6cd]/30 border-dashed rounded-xl cursor-pointer hover:bg-slate-100 transition-all text-center">
                    <div className="mx-auto flex flex-col items-center">
                      <Upload className="w-6 h-6 text-[#006c49] mb-1" />
                      <span className="text-xs text-[#191c1e] font-semibold">Subir Archivo o Reporte Aéreo (EagleView)</span>
                      <span className="text-[10px] text-[#7c839b]">Arrastra aquí o haz clic para examinar</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedLead.documents.length === 0 ? (
                      <p className="text-xs text-[#7c839b] text-center py-4 font-medium">No hay documentos cargados en el expediente.</p>
                    ) : (
                      selectedLead.documents.map((doc) => (
                        <div key={doc.id} className="p-3 bg-white border border-[#c6c6cd]/30 rounded-xl flex items-center justify-between hover:bg-[#f7f9fb] transition-all">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded bg-[#f2f4f6] text-[#006c49] flex items-center justify-center font-bold text-xs shrink-0 border">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-[#191c1e] block truncate max-w-[200px]">{doc.name}</span>
                              <span className="text-[10px] text-[#7c839b] font-mono font-medium block">{doc.size} • {doc.category}</span>
                            </div>
                          </div>
                          <button className="text-xs text-[#006c49] font-bold hover:underline">Descargar</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "production" && (
                <div className="p-4 bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                    <h3 className="font-sans text-xs font-bold text-[#131b2e]">Estado de Producción & Entrega</h3>
                    <span className="px-2 py-0.5 bg-[#6cf8bb]/20 text-[#002113] text-[9px] rounded font-mono font-bold">PROYECTO ACTIVO</span>
                  </div>
                  <p className="text-xs text-[#45464d] leading-relaxed">
                    Una vez aprobado el estimado por el seguro y firmado el contrato, este cliente pasará automáticamente a la tubería de producción para el pedido de materiales y asignación de cuadrillas.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#7c839b]">
                    <Clock className="w-4 h-4" />
                    <span>Próximo paso programado: Reunión de peritaje en sitio.</span>
                  </div>
                </div>
              )}

            </div>

            {/* Checklist panel: Right 4-cols */}
            <div className="md:col-span-4 bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 border-b pb-1.5">
                <FileCheck2 className="w-4 h-4 text-[#006c49]" />
                <h3 className="font-sans text-xs font-bold text-[#131b2e]">Tareas Pendientes</h3>
              </div>

              <div className="space-y-2">
                {selectedLead.tasks.map((task) => {
                  const isComp = task.status === "completed";
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => onToggleTask(selectedLead.id, task.id)}
                      className="flex items-start gap-2.5 p-2 bg-white border border-[#c6c6cd]/20 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none"
                    >
                      {isComp ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#7c839b] mt-0.5 shrink-0" />
                      )}
                      <div className="space-y-0.5">
                        <span className={`text-[11px] font-semibold leading-tight block ${isComp ? "line-through text-[#7c839b]" : "text-[#191c1e]"}`}>
                          {task.title}
                        </span>
                        <span className="text-[9px] font-mono text-[#7c839b] block">{task.dueDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
