import React, { useState, useMemo, useEffect } from "react";
import { Lead, InsuranceCompanyStats } from "../types";
import {
  getAggregatedInsuranceDirectory,
  saveCustomContactToDb,
  fetchDbInsuranceCompanies,
  MASTER_INSURANCE_COMPANIES
} from "../data/insuranceDirectoryData";
import {
  ShieldCheck,
  Search,
  Phone,
  Mail,
  ExternalLink,
  Users,
  Copy,
  Check,
  Plus,
  Building2,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  PieChart,
  BarChart3,
  X,
  FileText
} from "lucide-react";

interface InsuranceDirectoryViewProps {
  claims: Lead[];
  onNavigateToClaim: (claimId: string) => void;
  onInsuranceRegistered?: () => void;
}

export default function InsuranceDirectoryView({
  claims,
  onNavigateToClaim,
  onInsuranceRegistered
}: InsuranceDirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom contact modal state inside detail panel
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // New Custom Insurance Modal
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState("");
  const [customCompanyEmail, setCustomCompanyEmail] = useState("");
  const [customCompanyPhone, setCustomCompanyPhone] = useState("");
  const [customCompanyNotes, setCustomCompanyNotes] = useState("");

  // Re-fetch / re-aggregate trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync with Supabase on mount
  useEffect(() => {
    fetchDbInsuranceCompanies().then(() => {
      setRefreshKey(k => k + 1);
    });
  }, []);

  const directory = useMemo(() => {
    return getAggregatedInsuranceDirectory(claims);
  }, [claims, refreshKey]);

  // Selected company object
  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return directory.find(item => item.id === selectedCompanyId) || null;
  }, [directory, selectedCompanyId]);

  // Filtered List based on search
  const filteredList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return directory;

    return directory.filter(item => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.aliases.some(a => a.toLowerCase().includes(q)) ||
        item.emails.some(e => e.toLowerCase().includes(q)) ||
        item.phones.some(p => p.toLowerCase().includes(q)) ||
        item.adjusters.some(adj => adj.toLowerCase().includes(q))
      );
    });
  }, [directory, searchTerm]);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSaving(true);
    await saveCustomContactToDb(selectedCompany.name, {
      email: newEmail,
      phone: newPhone,
      notes: newNotes
    });
    setIsSaving(false);

    setIsAddingContact(false);
    setNewEmail("");
    setNewPhone("");
    setNewNotes("");
    setRefreshKey(k => k + 1);
    if (onInsuranceRegistered) onInsuranceRegistered();
  };

  const handleCreateNewInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCompanyName.trim()) return;

    const companyName = customCompanyName.trim();
    setIsSaving(true);
    await saveCustomContactToDb(companyName, {
      email: customCompanyEmail.trim(),
      phone: customCompanyPhone.trim(),
      notes: customCompanyNotes.trim()
    });
    setIsSaving(false);

    const newId = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    setIsAddingNewCompany(false);
    setCustomCompanyName("");
    setCustomCompanyEmail("");
    setCustomCompanyPhone("");
    setCustomCompanyNotes("");
    setRefreshKey(k => k + 1);
    setSelectedCompanyId(newId);
    if (onInsuranceRegistered) onInsuranceRegistered();
  };

  // SVG Donut Chart Calculator for Selected Company
  const chartData = useMemo(() => {
    if (!selectedCompany) return null;
    const total = selectedCompany.totalClaims;
    if (total === 0) {
      return {
        hasData: false,
        total: 0,
        approvedPct: 0,
        disputePct: 0,
        deniedPct: 0,
        activePct: 0
      };
    }

    const approved = selectedCompany.finalizedClaims + selectedCompany.approvedClaims;
    const dispute = selectedCompany.inDisputeClaims;
    const denied = selectedCompany.deniedClaims;
    const otherActive = Math.max(0, selectedCompany.totalClaims - approved - dispute - denied);

    const approvedPct = Math.round((approved / total) * 100);
    const disputePct = Math.round((dispute / total) * 100);
    const deniedPct = Math.round((denied / total) * 100);
    const activePct = Math.max(0, 100 - approvedPct - disputePct - deniedPct);

    return {
      hasData: true,
      total,
      approved,
      approvedPct,
      dispute,
      disputePct,
      denied,
      deniedPct,
      otherActive,
      activePct
    };
  }, [selectedCompany]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] min-h-0 select-none flex flex-col items-center">
      
      {/* ── Main Clean Spotlight View ────────────────────────────── */}
      <div className="w-full max-w-4xl px-6 py-10 space-y-8">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Panel de Inteligencia de Aseguradoras</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0F172A] tracking-tight">
            Directorio y Estadísticas de Aseguradoras
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto">
            Busca cualquier aseguradora para consultar al instante sus correos usados, teléfonos, ajustadores asociados y gráficas de casos aprobados vs negados.
          </p>
        </div>

        {/* ── Modern Search Bar ───────────────────────────────── */}
        <div className="relative shadow-lg rounded-2xl bg-white border border-slate-200/90 p-2 transition-all focus-within:ring-2 focus-within:ring-[#eab308] focus-within:border-[#eab308]">
          <div className="flex items-center px-3 py-1.5 gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Escribe el nombre de la aseguradora (ej. Safeco, State Farm, Allstate...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm md:text-base font-semibold text-[#0F172A] placeholder-slate-400 bg-transparent outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center transition-colors shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Aseguradoras Frecuentes
            </span>
            <button
              onClick={() => setIsAddingNewCompany(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Otra Aseguradora</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "Safeco Insurance (Liberty Mutual)",
              "State Farm",
              "Allstate",
              "Travelers",
              "Liberty Mutual",
              "USAA",
              "Farmers Insurance",
              "Nationwide",
              "Progressive (Home Advantage)"
            ].map(name => {
              const matched = directory.find(d => d.name === name || d.aliases.includes(name));
              if (!matched) return null;

              return (
                <button
                  key={matched.id}
                  onClick={() => setSelectedCompanyId(matched.id)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-xs hover:shadow-md flex items-center gap-2 group cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#eab308]" />
                  <span>{matched.name.split("(")[0].trim()}</span>
                  {matched.totalClaims > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-50 group-hover:bg-slate-800 text-blue-700 group-hover:text-blue-200 text-[10px] rounded-md font-mono">
                      {matched.totalClaims}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search Results / Clean List ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
              {searchTerm ? `Resultados para "${searchTerm}"` : "Todas las Aseguradoras"} ({filteredList.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Haz clic en cualquier aseguradora para abrir su panel</span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-[#0F172A]">No se encontró ninguna aseguradora con ese nombre</p>
              <p className="text-xs text-slate-400">¿Deseas agregarla al catálogo del CRM?</p>
              <button
                onClick={() => {
                  setCustomCompanyName(searchTerm);
                  setIsAddingNewCompany(true);
                }}
                className="mt-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#eab308]" />
                <span>Agregar "{searchTerm}"</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCompanyId(item.id)}
                  className="p-4 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#eab308] font-black text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors truncate">
                          {item.name}
                        </h2>
                        {item.totalClaims > 0 ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100 shrink-0">
                            {item.totalClaims} {item.totalClaims === 1 ? "caso" : "casos"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full shrink-0">
                            Sin casos aún
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-blue-500" /> {item.emails.length} {item.emails.length === 1 ? "correo" : "correos"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-500" /> {item.phones.length} {item.phones.length === 1 ? "teléfono" : "teléfonos"}
                        </span>
                        {item.adjusters.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" /> {item.adjusters.length} {item.adjusters.length === 1 ? "ajustador" : "ajustadores"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex items-center gap-1">
                      <span>Ver detalles</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Interactive Detail Panel (Modal) ───────────────────────── */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            {/* Modal Header Banner */}
            <div className="px-6 py-5 bg-[#0F172A] text-white flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 text-[#eab308] font-black text-base flex items-center justify-center shrink-0 shadow-md">
                  {selectedCompany.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
                      {selectedCompany.name}
                    </h2>
                    {selectedCompany.portalUrl && (
                      <a
                        href={selectedCompany.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[#eab308] hover:text-amber-300 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                        title="Abrir portal oficial de reclamos"
                      >
                        Portal Reclamos <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCompany.customNotes || "Información y analítica consolidada de la aseguradora."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddingContact(true)}
                  className="px-3 py-1.5 bg-[#eab308] hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-950" />
                  <span>+ Agregar Contacto</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedCompanyId(null);
                    setIsAddingContact(false);
                  }}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* ── 1. Gráficas y Estadísticas de Casos ──────────────── */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                      Rendimiento y Desglose de Casos
                    </h3>
                  </div>
                  <span className="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Total: {selectedCompany.totalClaims} {selectedCompany.totalClaims === 1 ? "caso" : "casos"}
                  </span>
                </div>

                {/* Progress Distribution Bar */}
                {selectedCompany.totalClaims > 0 ? (
                  <div className="space-y-3">
                    {/* Visual Segmented Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-200 flex overflow-hidden shadow-inner">
                      {chartData?.approvedPct ? (
                        <div
                          style={{ width: `${chartData.approvedPct}%` }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`Aprobados / Finalizados: ${chartData.approvedPct}%`}
                        />
                      ) : null}
                      {chartData?.disputePct ? (
                        <div
                          style={{ width: `${chartData.disputePct}%` }}
                          className="bg-amber-500 h-full transition-all"
                          title={`En Disputa / Suplemento: ${chartData.disputePct}%`}
                        />
                      ) : null}
                      {chartData?.deniedPct ? (
                        <div
                          style={{ width: `${chartData.deniedPct}%` }}
                          className="bg-rose-500 h-full transition-all"
                          title={`Negados: ${chartData.deniedPct}%`}
                        />
                      ) : null}
                      {chartData?.activePct ? (
                        <div
                          style={{ width: `${chartData.activePct}%` }}
                          className="bg-blue-500 h-full transition-all"
                          title={`En Proceso / Activos: ${chartData.activePct}%`}
                        />
                      ) : null}
                    </div>

                    {/* Detailed Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      
                      {/* Aprobados / Finalizados */}
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between text-emerald-700">
                          <span className="text-[10px] font-black uppercase">Aprobados / Cierre</span>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-emerald-700">
                            {selectedCompany.finalizedClaims + selectedCompany.approvedClaims}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600">
                            ({chartData?.approvedPct}%)
                          </span>
                        </div>
                      </div>

                      {/* En Disputa / Suplemento */}
                      <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                        <div className="flex items-center justify-between text-amber-700">
                          <span className="text-[10px] font-black uppercase">En Disputa / Supl.</span>
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-amber-700">
                            {selectedCompany.inDisputeClaims}
                          </span>
                          <span className="text-[11px] font-bold text-amber-600">
                            ({chartData?.disputePct}%)
                          </span>
                        </div>
                      </div>

                      {/* Negados */}
                      <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-2xs">
                        <div className="flex items-center justify-between text-rose-700">
                          <span className="text-[10px] font-black uppercase">Negados</span>
                          <XCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-rose-700">
                            {selectedCompany.deniedClaims}
                          </span>
                          <span className="text-[11px] font-bold text-rose-600">
                            ({chartData?.deniedPct}%)
                          </span>
                        </div>
                      </div>

                      {/* En Proceso */}
                      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                        <div className="flex items-center justify-between text-blue-700">
                          <span className="text-[10px] font-black uppercase">En Proceso</span>
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xl font-black text-blue-700">
                            {selectedCompany.activeClaims}
                          </span>
                          <span className="text-[11px] font-bold text-blue-600">
                            ({chartData?.activePct}%)
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-slate-200 text-center space-y-1">
                    <BarChart3 className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No hay casos registrados aún con esta aseguradora</p>
                    <p className="text-[11px] text-slate-400">Las gráficas de aprobación y disputas se generarán automáticamente al crear proyectos.</p>
                  </div>
                )}
              </div>

              {/* ── 2. Correos y Teléfonos Registrados ───────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Correos de Reclamos */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                        Correos Electrónicos ({selectedCompany.emails.length})
                      </h4>
                    </div>
                  </div>

                  {selectedCompany.emails.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                      No hay correos registrados aún.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCompany.emails.map(email => (
                        <div
                          key={email}
                          className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-blue-950 block truncate">
                              {email}
                            </span>
                            <span className="text-[10px] text-blue-600 font-medium">Claims & Reclamaciones</span>
                          </div>

                          <button
                            onClick={(e) => handleCopy(email, e)}
                            className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-800 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                            title="Copiar correo"
                          >
                            {copiedText === email ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-[10px] text-emerald-600">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[10px]">Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teléfonos de Reclamos */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                        Líneas Telefónicas ({selectedCompany.phones.length})
                      </h4>
                    </div>
                  </div>

                  {selectedCompany.phones.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                      No hay teléfonos registrados aún.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCompany.phones.map(phone => (
                        <div
                          key={phone}
                          className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-emerald-950 block">
                              {phone}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium">Línea Directa / Ajustadores</span>
                          </div>

                          <button
                            onClick={(e) => handleCopy(phone, e)}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                            title="Copiar teléfono"
                          >
                            {copiedText === phone ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-[10px] text-emerald-600">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span className="text-[10px]">Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* ── 3. Ajustadores con los que hemos trabajado ────────── */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                    Ajustadores y Peritos Asociados ({selectedCompany.adjusters.length})
                  </h4>
                </div>

                {selectedCompany.adjusters.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic">
                    Aún no se han registrado nombres de ajustadores en casos con esta aseguradora.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedCompany.adjusters.map(adj => {
                      // Find which claims this adjuster worked on
                      const adjusterClaims = selectedCompany.claims.filter(c => c.adjusterName === adj);

                      return (
                        <div
                          key={adj}
                          className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            👤
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-[#0F172A] block truncate">{adj}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {adjusterClaims.length} {adjusterClaims.length === 1 ? "caso gestionado" : "casos gestionados"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── 4. Historial de Casos y Expedientes ─────────────── */}
              {selectedCompany.claims.length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-black text-[#0F172A] uppercase tracking-wider">
                        Expedientes de Casos Trabajados ({selectedCompany.claims.length})
                      </h4>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedCompany.claims.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCompanyId(null);
                          onNavigateToClaim(c.id);
                        }}
                        className="p-3 hover:bg-blue-50/50 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0F172A] group-hover:text-blue-700 truncate">
                              {c.name}
                            </span>
                            {c.claimNumber && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                #{c.claimNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {c.address || "Sin dirección"} {c.adjusterName && `• Ajustador: ${c.adjusterName}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                            {c.status}
                          </span>
                          <button className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>Abrir caso</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                onClick={() => {
                  setSelectedCompanyId(null);
                  setIsAddingContact(false);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Cerrar Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Sub-Modal: Agregar Contacto a la Aseguradora Seleccionada ─── */}
      {isAddingContact && selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">Agregar Datos a {selectedCompany.name}</h3>
                <p className="text-xs text-slate-400">Guarda un nuevo correo o teléfono en el catálogo maestro</p>
              </div>
              <button
                onClick={() => setIsAddingContact(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nuevo Correo de Reclamos
                </label>
                <input
                  type="email"
                  placeholder="ej. claims.adjuster@aseguradora.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nuevo Teléfono / Línea Directa
                </label>
                <input
                  type="text"
                  placeholder="ej. 1-800-555-0199"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Notas adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Horario, suplementos, extensión..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingContact(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F172A] hover:bg-[#1e293b] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#eab308]" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Registrar Nueva Aseguradora ─────────────────── */}
      {isAddingNewCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in select-none">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-[#0F172A]">Registrar Nueva Aseguradora</h3>
                <p className="text-xs text-slate-400">Agrega un nuevo proveedor al catálogo maestro</p>
              </div>
              <button
                onClick={() => setIsAddingNewCompany(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewInsurance} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nombre de la Compañía de Seguros *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Texas Farm Bureau, Erie Insurance, etc."
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Correo Principal de Reclamos
                </label>
                <input
                  type="email"
                  placeholder="ej. claims@aseguradora.com"
                  value={customCompanyEmail}
                  onChange={(e) => setCustomCompanyEmail(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Teléfono Principal de Reclamos
                </label>
                <input
                  type="text"
                  placeholder="ej. 1-800-000-0000"
                  value={customCompanyPhone}
                  onChange={(e) => setCustomCompanyPhone(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Notas / Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Información sobre cobertura, portal, etc."
                  value={customCompanyNotes}
                  onChange={(e) => setCustomCompanyNotes(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl p-2.5 text-xs text-[#0F172A] focus:bg-white focus:border-[#eab308] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingNewCompany(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F172A] hover:bg-[#1e293b] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#eab308]" />
                  <span>Crear y Abrir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
