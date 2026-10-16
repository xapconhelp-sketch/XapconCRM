import { RoleSectionIcon, RoleIconTile } from "./contractor/DesignSystem";
import { RoleModal } from "./contractor/DesignSystem";
import { RoleInput, RoleTextarea } from "./contractor/DesignSystem";
import IllustratedIcon from "./contractor/IllustratedIcon";
import React, { useEffect, useMemo, useState } from "react";
import { Lead } from "../types";
import {
  deleteInsuranceDirectoryCompany,
  fetchDbInsuranceCompanies,
  getDeletedInsuranceDirectoryKeys,
  getInsuranceDirectoryEdits,
  getInsuranceDirectoryKey,
  getAggregatedInsuranceDirectory,
  MASTER_INSURANCE_COMPANIES,
  restoreInsuranceDirectoryCompany,
  saveInsuranceDirectoryEdit,
  saveCustomContactToDb,
} from "../data/insuranceDirectoryData";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

interface InsuranceDirectoryViewProps {
  claims: Lead[];
  onNavigateToClaim: (claimId: string) => void;
  onInsuranceRegistered?: () => void;
  canManageDirectory?: boolean;
  isSuperAdmin?: boolean;
  directoryRefreshKey?: number;
}

type DirectoryFilter = "all" | "with-cases" | "missing-contact";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8C6A22] focus:ring-4 focus:ring-[#8C6A22]/10";

export default function InsuranceDirectoryView({
  claims,
  onNavigateToClaim,
  onInsuranceRegistered,
  canManageDirectory = true,
  isSuperAdmin = false,
  directoryRefreshKey = 0,
}: InsuranceDirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [customCompanyName, setCustomCompanyName] = useState("");
  const [customCompanyEmail, setCustomCompanyEmail] = useState("");
  const [customCompanyNotes, setCustomCompanyNotes] = useState("");
  const [editEmails, setEditEmails] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [directoryActionError, setDirectoryActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDbInsuranceCompanies().then(() => setRefreshKey((key) => key + 1));
  }, []);

  const directory = useMemo(() => {
    const deleted = new Set(getDeletedInsuranceDirectoryKeys());
    const edits = getInsuranceDirectoryEdits();
    return getAggregatedInsuranceDirectory(claims)
      .filter((company) => !deleted.has(company.id))
      .map((company) => {
        const edit = edits[company.id];
        return edit ? { ...company, emails: edit.emails, customNotes: edit.notes } : company;
      });
  }, [claims, refreshKey, directoryRefreshKey]);

  useEffect(() => {
    if (!selectedCompanyId && directory.length) setSelectedCompanyId(directory[0].id);
  }, [directory, selectedCompanyId]);

  const selectedCompany = useMemo(
    () => directory.find((company) => company.id === selectedCompanyId) || null,
    [directory, selectedCompanyId],
  );
  const selectedCompanyNote = selectedCompany?.customNotes && !MASTER_INSURANCE_COMPANIES.some(
    (master) => master.description === selectedCompany.customNotes,
  ) ? selectedCompany.customNotes : "";

  const filteredList = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return directory.filter((company) => {
      const matchesQuery = !query || [
        company.name,
        ...company.aliases,
        ...company.emails,
        ...company.adjusters,
      ].some((value) => value.toLowerCase().includes(query));
      const matchesFilter = filter === "all"
        || (filter === "with-cases" && company.totalClaims > 0)
        || (filter === "missing-contact" && company.emails.length === 0);
      return matchesQuery && matchesFilter;
    });
  }, [directory, filter, searchTerm]);

  const summary = useMemo(() => ({
    companies: directory.length,
    cases: directory.reduce((count, company) => count + company.totalClaims, 0),
    withContacts: directory.filter((company) => company.emails.length > 0).length,
  }), [directory]);

  const statusBreakdown = useMemo(() => {
    if (!selectedCompany || selectedCompany.totalClaims === 0) return null;
    const total = selectedCompany.totalClaims;
    const approved = selectedCompany.approvedClaims + selectedCompany.finalizedClaims;
    const dispute = selectedCompany.inDisputeClaims;
    const denied = selectedCompany.deniedClaims;
    const active = Math.max(0, total - approved - dispute - denied);
    return [
      { label: "Aprobados y cerrados", count: approved, color: "bg-emerald-500", text: "text-emerald-700", illustration: "success" as const, icon: CheckCircle2 },
      { label: "En seguimiento", count: active, color: "bg-blue-500", text: "text-blue-700", illustration: "activity" as const, icon: Activity },
      { label: "En disputa", count: dispute, color: "bg-amber-500", text: "text-amber-700", illustration: "clock" as const, icon: Clock3 },
      { label: "Negados", count: denied, color: "bg-rose-500", text: "text-rose-700", illustration: "declined" as const, icon: XCircle },
    ].map((item) => ({ ...item, percent: Math.round((item.count / total) * 100) }));
  }, [selectedCompany]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedText(value);
      window.setTimeout(() => setCopiedText((current) => current === value ? null : current), 1800);
    } catch (error) {
      console.warn("No se pudo copiar el dato de contacto:", error);
    }
  };

  const refreshDirectory = () => {
    setRefreshKey((key) => key + 1);
    onInsuranceRegistered?.();
  };

  const handleSaveContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompany || (!newEmail.trim() && !newNotes.trim())) return;
    setIsSaving(true);
    try {
      await saveCustomContactToDb(selectedCompany.name, {
        email: newEmail.trim(), notes: newNotes.trim(),
      });
      setIsAddingContact(false);
      setNewEmail(""); setNewNotes("");
      refreshDirectory();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    const companyName = customCompanyName.trim();
    if (!companyName) return;
    setIsSaving(true);
    try {
      restoreInsuranceDirectoryCompany(getInsuranceDirectoryKey(companyName));
      await saveCustomContactToDb(companyName, {
        email: customCompanyEmail.trim(),
        notes: customCompanyNotes.trim(),
      });
      setIsAddingNewCompany(false);
      setCustomCompanyName(""); setCustomCompanyEmail(""); setCustomCompanyNotes("");
      const newId = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      setSelectedCompanyId(newId);
      setShowMobileDetail(true);
      refreshDirectory();
    } finally {
      setIsSaving(false);
    }
  };

  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    setShowMobileDetail(true);
  };

  const openEditCompany = () => {
    if (!selectedCompany) return;
    setEditEmails(selectedCompany.emails.join("\n"));
    setEditNotes(selectedCompany.customNotes || "");
    setDirectoryActionError("");
    setIsEditingCompany(true);
  };

  const handleEditCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCompany) return;
    const emails = Array.from(new Set<string>(
      editEmails.split(/[\n,;]+/).map((email: string) => email.trim()).filter((email: string) => email.length > 0),
    ));
    const invalidEmail = emails.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmail) {
      setDirectoryActionError(`Revisa el formato del correo: ${invalidEmail}`);
      return;
    }
    setIsSaving(true);
    setDirectoryActionError("");
    try {
      const result = await saveInsuranceDirectoryEdit(selectedCompany.id, selectedCompany.name, {
        emails,
        notes: editNotes.trim(),
      });
      setRefreshKey((key) => key + 1);
      onInsuranceRegistered?.();
      if (!result.success) {
        setDirectoryActionError(`Los cambios se guardaron localmente, pero no se sincronizaron: ${result.error || "error de conexión"}`);
      } else {
        setIsEditingCompany(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    setIsSaving(true);
    setDirectoryActionError("");
    try {
      const result = await deleteInsuranceDirectoryCompany(selectedCompany.id, selectedCompany.name);
      if (!result.success) {
        setDirectoryActionError(`No se eliminó porque el cambio no pudo sincronizarse: ${result.error || "error de conexión"}`);
        return;
      }
      setIsConfirmingDelete(false);
      setShowMobileDetail(false);
      setSelectedCompanyId(directory.find((company) => company.id !== selectedCompany.id)?.id || null);
      setRefreshKey((key) => key + 1);
      onInsuranceRegistered?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="insurance-directory-page flex-1 min-h-0 overflow-y-auto bg-[#F5F7FA] text-slate-800">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="insurance-directory-hero relative overflow-hidden rounded-[26px] bg-[#142B40] px-5 py-4 text-white shadow-[0_18px_50px_-26px_rgba(20,43,64,.65)] sm:px-8 sm:py-5">
          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-1 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl"><RoleSectionIcon name="insurance" />Directorio de aseguranzas</h1>
            </div>
            {canManageDirectory && <button
              onClick={() => { setCustomCompanyName(""); setIsAddingNewCompany(true); }}
              className="admin-primary-3d btn-gold-3d inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8C6A22] px-4 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-4 focus:ring-[#8C6A22]/25"
            >
              <Plus className="h-4 w-4" /> Nueva aseguradora
            </button>}
          </div>
          <div className="relative mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3 sm:gap-6">
            <SummaryMetric label="Aseguradoras en catálogo" value={summary.companies} illustration="insurance" icon={Building2} isSuperAdmin={isSuperAdmin} />
            <SummaryMetric label="Casos relacionados" value={summary.cases} illustration="claim" icon={FileText} isSuperAdmin={isSuperAdmin} />
            <SummaryMetric label="Con correo registrado" value={summary.withContacts} illustration="mail" icon={Mail} isSuperAdmin={isSuperAdmin} />
          </div>
        </header>

        <main className="insurance-directory-layout grid min-h-[620px] grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(290px,360px)_minmax(0,1fr)]">
          <section className={`insurance-directory-list ${showMobileDetail ? "hidden xl:block" : "block"} overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)] xl:sticky xl:top-4`}>
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Aseguradoras</h2>
                  <p className="mt-1 text-xs text-slate-500">Busca por nombre, contacto o ajustador</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-600">
                  {filteredList.length} / {directory.length}
                </span>
              </div>
              <label className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2.5 transition focus-within:border-[#8C6A22] focus-within:ring-4 focus-within:ring-[#8C6A22]/10">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <RoleInput
                  type="search"
                  placeholder="Buscar aseguradora..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {searchTerm && <button onClick={() => setSearchTerm("")} aria-label="Limpiar búsqueda" className="rounded p-0.5 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
              </label>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>Todas</FilterPill>
                <FilterPill active={filter === "with-cases"} onClick={() => setFilter("with-cases")}>Con casos</FilterPill>
                <FilterPill active={filter === "missing-contact"} onClick={() => setFilter("missing-contact")}>Sin contacto</FilterPill>
              </div>
            </div>
            <div className="max-h-[680px] overflow-y-auto p-2">
              {filteredList.length ? filteredList.map((company) => {
                const isSelected = selectedCompanyId === company.id;
                return (
                  <button
                    type="button"
                    key={company.id}
                    onClick={() => selectCompany(company.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${isSelected ? "bg-[#F5F1EC] ring-1 ring-[#E9D5C3]" : "hover:bg-slate-50"}`}
                  >
                    <CompanyMark active={isSelected} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-semibold ${isSelected ? "text-[#102A46]" : "text-slate-800"}`}>{company.name}</span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{company.totalClaims} {company.totalClaims === 1 ? "caso" : "casos"}</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                        <span>{company.emails.length} {company.emails.length === 1 ? "correo" : "correos"}</span>
                      </span>
                    </span>
                    {isSelected ? <ChevronRight className="h-4 w-4 shrink-0 text-[#8C6A22]" /> : <span className="mr-1 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent group-hover:bg-slate-300" />}
                  </button>
                );
              }) : (
                <div className="px-4 py-12 text-center">
                  <Search className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Sin resultados</p>
                  <p className="mt-1 text-xs text-slate-500">Prueba otro término o registra una aseguradora nueva.</p>
                  {canManageDirectory && searchTerm && <button onClick={() => { setCustomCompanyName(searchTerm); setIsAddingNewCompany(true); }} className="mt-3 text-xs font-semibold text-[#664A14] hover:underline">Agregar “{searchTerm}”</button>}
                </div>
              )}
            </div>
          </section>

          {selectedCompany ? (
            <section className={`insurance-directory-detail ${showMobileDetail ? "block" : "hidden xl:block"} min-w-0 space-y-5`}>
              <div className="insurance-company-summary overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)]">
                <div className="border-b border-slate-100 px-5 pt-4 xl:hidden"><button onClick={() => setShowMobileDetail(false)} className="inline-flex items-center gap-1.5 pb-3 text-xs font-semibold text-[#664A14]"><ChevronRight className="h-4 w-4 rotate-180" /> Volver a aseguradoras</button></div>
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-start xl:justify-between xl:p-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <CompanyMark large />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#664A14]">Ficha de aseguradora</p>
                      <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-[#102A46] sm:text-2xl">{selectedCompany.name}</h2>
                      {selectedCompanyNote && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{selectedCompanyNote}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {canManageDirectory && <>
                      <button onClick={openEditCompany} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-[#8C6A22] hover:text-[#664A14]"><Pencil className="h-3.5 w-3.5" /> Editar</button>
                      <button onClick={() => setIsAddingContact(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#102A46] px-3 text-xs font-semibold text-white transition hover:bg-[#193856]"><Plus className="h-3.5 w-3.5" /> Agregar contacto</button>
                      <button onClick={() => { setDirectoryActionError(""); setIsConfirmingDelete(true); }} aria-label={`Eliminar ${selectedCompany.name}`} title="Eliminar aseguradora del directorio" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </>}
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  <DetailMetric label="Casos" value={selectedCompany.totalClaims} />
                  <DetailMetric label="Correos" value={selectedCompany.emails.length} />
                  <DetailMetric label="Ajustadores" value={selectedCompany.adjusters.length} />
                </div>
              </div>

              <div className="insurance-directory-contact-grid grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)]">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)] sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div><SectionEyebrow>Actividad</SectionEyebrow><h3 className="mt-1 text-base font-semibold text-slate-900">Desglose de expedientes</h3></div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{selectedCompany.totalClaims} total</span>
                  </div>
                  {statusBreakdown ? <>
                    <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label="Distribución de casos por estado">
                      {statusBreakdown.map((item) => item.count > 0 && <div key={item.label} title={`${item.label}: ${item.count}`} style={{ width: `${item.percent}%` }} className={`${item.color} transition-all`} />)}
                    </div>
                    <div className="insurance-status-grid mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {statusBreakdown.map((item) => {
                        return <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#FBFCFD] p-3">
                          {isSuperAdmin ? <IllustratedIcon name={item.illustration} className={`insurance-status-icon ${item.text}`} /> : <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ${item.text}`}><item.icon className="h-4 w-4" /></span>}
                          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-600">{item.label}</span><span className="mt-0.5 block text-sm font-semibold tabular-nums text-slate-900">{item.count} <span className="text-xs font-normal text-slate-400">· {item.percent}%</span></span></span>
                        </div>;
                      })}
                    </div>
                  </> : <EmptyInline icon={BarChart3} title="Todavía no hay expedientes" description="Las métricas aparecerán cuando existan casos asociados a esta aseguradora." />}
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)] sm:p-6">
                  <div><SectionEyebrow>Agenda de trabajo</SectionEyebrow><h3 className="mt-1 text-base font-semibold text-slate-900">Correos registrados</h3></div>
                  <div className="mt-4 space-y-2">
                    {selectedCompany.emails.map((email) => <div key={email}><ContactRow value={email} copied={copiedText === email} onCopy={handleCopy} /></div>)}
                    {!selectedCompany.emails.length && <EmptyInline icon={Mail} title="No hay correos guardados" description="Agrega una dirección de reclamos para tenerla a mano." />}
                  </div>
                  {canManageDirectory && <button onClick={() => setIsAddingContact(true)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#664A14] hover:text-[#754522]"><Plus className="h-3.5 w-3.5" /> Añadir dato de contacto</button>}
                </section>
              </div>

              <div className="insurance-directory-history-grid grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)] sm:p-6">
                  <div><SectionEyebrow>Personas</SectionEyebrow><h3 className="mt-1 text-base font-semibold text-slate-900">Ajustadores asociados</h3></div>
                  {selectedCompany.adjusters.length ? <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCompany.adjusters.map((adjuster) => <span key={adjuster} title={`${selectedCompany.claims.filter((claim) => claim.adjusterName === adjuster).length} casos`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-[#FBFCFD] px-3 py-2 text-xs font-medium text-slate-700"><Users className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{adjuster}</span><span className="rounded bg-white px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">{selectedCompany.claims.filter((claim) => claim.adjusterName === adjuster).length}</span></span>)}
                  </div> : <EmptyInline icon={Users} title="Sin ajustadores asociados" description="Se identificarán a partir de los expedientes vinculados." />}
                </section>

                <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)] sm:p-6">
                  <div className="flex items-start justify-between gap-3"><div><SectionEyebrow>Historial</SectionEyebrow><h3 className="mt-1 text-base font-semibold text-slate-900">Expedientes relacionados</h3></div><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-600">{selectedCompany.claims.length}</span></div>
                  {selectedCompany.claims.length ? <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
                    {selectedCompany.claims.map((claim) => <button key={claim.id} type="button" onClick={() => onNavigateToClaim(claim.id)} className="group flex w-full items-center gap-3 p-3 text-left transition hover:bg-[#F8FAFC] sm:px-4">
                      <RoleIconTile name="claim" className="contractor-row-icon"><span className="admin-icon-well admin-icon-well-light flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F6F8] text-slate-500 transition group-hover:bg-[#E8EEF2]"><FileText className="h-4 w-4" /></span></RoleIconTile>
                      <span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold text-slate-800">{claim.name}</span>{claim.claimNumber && <span className="hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">#{claim.claimNumber}</span>}</span><span className="mt-1 block truncate text-xs text-slate-500">{claim.address || "Sin dirección"}{claim.adjusterName ? ` · ${claim.adjusterName}` : ""}</span></span>
                      <span className="hidden max-w-28 truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 sm:block">{claim.status}</span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#664A14]" />
                    </button>)}
                  </div> : <EmptyInline icon={FileText} title="Sin expedientes relacionados" description="Los casos asociados a esta aseguradora aparecerán aquí." />}
                </section>
              </div>
            </section>
          ) : <section className={`${showMobileDetail ? "flex" : "hidden xl:flex"} min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center`}>
            <div className="max-w-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F1EC] text-[#664A14]"><Building2 className="h-6 w-6" /></span><h2 className="mt-4 text-lg font-semibold text-slate-900">Elige una aseguradora</h2><p className="mt-2 text-sm leading-6 text-slate-500">Selecciona un registro del catálogo para consultar su actividad y datos de contacto.</p></div>
          </section>}
        </main>
      </div>

      {canManageDirectory && isAddingContact && selectedCompany && <Dialog title="Agregar dato de contacto" subtitle={`Completa la agenda de ${selectedCompany.name}.`} onClose={() => setIsAddingContact(false)}>
        <form onSubmit={handleSaveContact} className="space-y-4">
          <FormField label="Correo de reclamos" type="email" placeholder="claims@aseguradora.com" value={newEmail} onChange={setNewEmail} />
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Notas para el equipo</span><RoleTextarea rows={3} placeholder="Horario, extensión o indicaciones..." value={newNotes} onChange={(event) => setNewNotes(event.target.value)} className={`${inputClass} resize-y`} /></label>
          <DialogActions onCancel={() => setIsAddingContact(false)} saving={isSaving} submitLabel="Guardar contacto" disabled={!newEmail.trim() && !newNotes.trim()} />
        </form>
      </Dialog>}

      {canManageDirectory && isAddingNewCompany && <Dialog title="Registrar aseguradora" subtitle="Añádela al catálogo con la información de contacto disponible." onClose={() => setIsAddingNewCompany(false)}>
        <form onSubmit={handleCreateCompany} className="space-y-4">
          <FormField label="Nombre de la compañía" required placeholder="Nombre de la aseguradora" value={customCompanyName} onChange={setCustomCompanyName} />
          <FormField label="Correo de reclamos" type="email" placeholder="claims@aseguradora.com" value={customCompanyEmail} onChange={setCustomCompanyEmail} />
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Notas</span><RoleTextarea rows={3} placeholder="Portal, horario u otra referencia..." value={customCompanyNotes} onChange={(event) => setCustomCompanyNotes(event.target.value)} className={`${inputClass} resize-y`} /></label>
          <DialogActions onCancel={() => setIsAddingNewCompany(false)} saving={isSaving} submitLabel="Crear aseguradora" disabled={!customCompanyName.trim()} />
        </form>
      </Dialog>}

      {canManageDirectory && isEditingCompany && selectedCompany && <Dialog title="Editar aseguradora" subtitle={`Actualiza los correos y las notas de ${selectedCompany.name}.`} onClose={() => setIsEditingCompany(false)}>
        <form onSubmit={handleEditCompany} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Correos de reclamos</span><RoleTextarea rows={6} value={editEmails} onChange={(event) => setEditEmails(event.target.value)} placeholder="Un correo por línea" className={`${inputClass} resize-y font-mono text-xs`} /><span className="mt-1.5 block text-[11px] text-slate-500">Puedes incluir varios; sepáralos con saltos de línea o comas.</span></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Notas</span><RoleTextarea rows={3} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Información útil para el equipo..." className={`${inputClass} resize-y`} /></label>
          {directoryActionError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{directoryActionError}</p>}
          <DialogActions onCancel={() => setIsEditingCompany(false)} saving={isSaving} submitLabel="Guardar cambios" />
        </form>
      </Dialog>}

      {canManageDirectory && isConfirmingDelete && selectedCompany && <Dialog title="Eliminar del directorio" subtitle={selectedCompany.name} onClose={() => setIsConfirmingDelete(false)}>
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-900">La aseguradora y sus correos y notas guardados se quitarán del directorio. Sus {selectedCompany.totalClaims} expedientes relacionados conservarán la información del caso.</div>
          {directoryActionError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{directoryActionError}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isSaving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Cancelar</button><button type="button" onClick={handleDeleteCompany} disabled={isSaving} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">{isSaving ? "Eliminando..." : <><Trash2 className="h-4 w-4" /> Eliminar aseguradora</>}</button></div>
        </div>
      </Dialog>}
    </div>
  );
}

function SummaryMetric({ label, value, illustration, icon: Icon, isSuperAdmin }: { label: string; value: number; illustration: "insurance" | "claim" | "mail"; icon: React.ElementType; isSuperAdmin: boolean }) {
  return <div className="flex items-center gap-3">{isSuperAdmin ? <IllustratedIcon name={illustration} className="insurance-summary-icon" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#D5BF7A]"><Icon className="h-4 w-4" /></span>}<span><span className="block text-lg font-semibold tabular-nums text-white">{value.toLocaleString()}</span><span className="block text-[11px] text-slate-300">{label}</span></span></div>;
}

function DetailMetric({ label, value }: { label: string; value: number }) {
  return <div className="px-4 py-3.5 sm:px-5"><span className="block text-lg font-semibold tabular-nums text-slate-900">{value.toLocaleString()}</span><span className="mt-0.5 block text-xs text-slate-500">{label}</span></div>;
}

function CompanyMark({ active = false, large = false }: { active?: boolean; large?: boolean }) {
  return <span className={`flex shrink-0 items-center justify-center border border-[#D5E7DE] bg-[#EAF3EF] text-[#14665B] ${large ? "h-14 w-14 rounded-2xl" : "h-10 w-10 rounded-xl"} ${active ? "ring-1 ring-[#14665B]/15" : ""}`}>
    <ShieldCheck aria-hidden="true" className={large ? "h-7 w-7" : "h-5 w-5"} strokeWidth={1.8} />
  </span>;
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${active ? "bg-[#102A46] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{children}</button>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#664A14]">{children}</p>;
}

function EmptyInline({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-[#FBFCFD] p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-medium text-slate-700">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span></div>;
}

function ContactRow({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: (value: string) => void }) {
  return <div className="insurance-contact-row flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-[#FBFCFD] px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Mail className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700" title={value}>{value}</span><button type="button" onClick={() => onCopy(value)} aria-label="Copiar correo" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition hover:border-[#8C6A22] hover:text-[#664A14]">{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copiado" : "Copiar"}</button></div>;
}

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <RoleModal title={title} onClose={onClose} busy={false} wide={false} outerProps={{"className": "fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm", "onMouseDown": (event) => { if (event.target === event.currentTarget) onClose(); }}} contentProps={{"role": "dialog", "aria-modal": "true", "aria-labelledby": "insurance-dialog-title", "className": "my-auto w-full max-w-lg rounded-2xl border border-white/70 bg-white p-5 shadow-2xl sm:p-6"}}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="insurance-dialog-title" className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div>
      {children}
    </RoleModal>;
}

function FormField({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-600">*</span>}</span><RoleInput type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}

function DialogActions({ onCancel, saving, submitLabel, disabled = false }: { onCancel: () => void; saving: boolean; submitLabel: string; disabled?: boolean }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Cancelar</button><button type="submit" disabled={saving || disabled} className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#102A46] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193856] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Guardando...</> : <><Check className="h-4 w-4" />{submitLabel}</>}</button></div>;
}
