import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgeDollarSign, CalendarDays, Check, CheckCircle2, ChevronRight, FileCheck2, FilePlus2, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import { Lead } from "../types";
import { supabase } from "../lib/supabase";

type EntryKind = "estimate" | "sow" | "supplement";
type ValueEntry = {
  id: string;
  lead_id: string;
  organization_id: string;
  record_type: EntryKind;
  entry_number: number;
  amount: number | null;
  event_date: string | null;
  estimate_sent: boolean;
};
type EntryDraft = Omit<Pick<ValueEntry, "record_type" | "entry_number" | "event_date" | "estimate_sent">, "amount"> & { amount: string; id?: string };

const MAX_REPEATED_ENTRIES = 4;
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);

function newDraft(recordType: "sow" | "supplement", entryNumber: number): EntryDraft {
  return { record_type: recordType, entry_number: entryNumber, amount: "", event_date: null, estimate_sent: false };
}

function ClaimSelector({ claims, selectedId, onSelect, query, onQuery }: {
  claims: Lead[]; selectedId: string; onSelect: (id: string) => void; query: string; onQuery: (value: string) => void;
}) {
  const visible = claims.filter((claim) => `${claim.name} ${claim.claimNumber} ${claim.company} ${claim.insuranceProvider}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <aside className="overflow-hidden rounded-[20px] border border-[#DDE3E8] bg-white shadow-[0_8px_30px_rgba(23,49,74,0.045)]">
      <div className="border-b border-white/10 bg-[linear-gradient(112deg,#102945_0%,#102A46_62%,#1A3854_100%)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-white">Expedientes</h2><p className="mt-1 text-[11px] text-[#CBD6DE]">Selecciona un caso para ver sus valores.</p></div>
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[#D3B566]/20 bg-[#8C6A22]/15 px-2 font-sans text-[11px] font-semibold text-[#D8C68A]">{claims.length}</span>
        </div>
        <label className="group relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#AFC0CD] transition-colors group-focus-within:text-[#D3B566]" />
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar por nombre o reclamo" className="h-10 w-full rounded-xl border border-white/15 bg-[#0C2036]/55 pl-9 pr-3 text-[12px] text-white outline-none transition placeholder:text-[#AFC0CD] focus:border-[#D3B566]/60 focus:bg-[#0C2036]/75 focus:ring-4 focus:ring-[#8C6A22]/[0.14]" />
        </label>
      </div>
      <div className="max-h-[min(68vh,720px)] space-y-1 overflow-y-auto p-2.5">
        {visible.map((claim) => {
          const active = selectedId === claim.id;
          return <button key={claim.id} type="button" onClick={() => onSelect(claim.id)} className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left transition duration-200 ${active ? "border-[#E8D8CB] bg-[#FBF9F2] shadow-[0_3px_12px_rgba(166,101,62,0.08)]" : "border-transparent text-[#344C60] hover:border-[#EDF0F2] hover:bg-[#FAFBFC]"}`}>
            {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#8C6A22]" />}
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-[#F1E2D6] text-[#664A14]" : "bg-[#F0F3F5] text-[#668095] group-hover:bg-white"}`}><FileCheck2 className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className={`block truncate font-sans text-[12px] font-semibold ${active ? "text-[#102A46]" : "text-[#344C60]"}`}>{claim.name}</span><span className="mt-1 block truncate font-sans text-[10px] tracking-[0.005em] text-[#82909C]">{claim.claimNumber} <span className="text-[#B0BAC2]">·</span> {claim.company || "Empresa sin identificar"}</span></span>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition ${active ? "translate-x-0 text-[#755613]" : "-translate-x-1 text-[#C1CAD1] opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} />
          </button>;
        })}
        {visible.length === 0 && <div className="px-3 py-10 text-center"><Search className="mx-auto h-5 w-5 text-[#BBC4CB]" /><p className="mt-2 text-[10px] font-medium text-[#82909C]">No encontramos expedientes.</p></div>}
      </div>
    </aside>
  );
}

function ValueEntryCard({ title, subtitle, kind, entries, onChange, onSave, onDelete, savingId, onAdd }: {
  title: string; subtitle: string; kind: "estimate" | "sow" | "supplement"; entries: EntryDraft[];
  onChange: (entryNumber: number, field: "amount" | "event_date" | "estimate_sent", value: number | string | boolean | null) => void;
  onSave: (entry: EntryDraft) => void; onDelete: (entry: EntryDraft) => void; savingId: string | null; onAdd?: () => void;
}) {
  const sum = entries.reduce((total, entry) => total + (Number(entry.amount) || 0), 0);
  const Icon = kind === "estimate" ? BadgeDollarSign : kind === "sow" ? FileCheck2 : FilePlus2;
  const count = kind === "estimate" ? "01 / 01" : `${String(entries.length).padStart(2, "0")} / 04`;
  return (
    <section className="overflow-hidden rounded-[20px] border border-[#DDE3E8] bg-white shadow-[0_8px_30px_rgba(23,49,74,0.045)] transition-shadow duration-200 hover:shadow-[0_12px_34px_rgba(23,49,74,0.065)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9EDF0] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFCFD_100%)] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${kind === "estimate" ? "bg-[#EEF2F6] text-[#2F5270]" : kind === "sow" ? "bg-[#F7F4E9] text-[#755613]" : "bg-[#EDF4F0] text-[#477B62]"}`}><Icon className="h-[17px] w-[17px]" /></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-[15px] font-semibold tracking-[-0.02em] text-[#102A46]">{title}</h3><span className="rounded-md bg-[#F1F4F6] px-2 py-1 font-sans text-[10px] font-semibold tracking-wide text-[#596D78]">{count}</span></div><p className="mt-1 text-[12px] text-[#596D78]">{subtitle}</p></div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 pl-[52px] sm:w-auto sm:justify-end sm:pl-0">
          {kind !== "estimate" && <div className="sm:text-right"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#87949F]">Total registrado</p><span className="mt-0.5 block text-[13px] font-semibold tabular-nums text-[#344C60]">{money(sum)}</span></div>}
          {onAdd && <button type="button" onClick={onAdd} disabled={entries.length >= MAX_REPEATED_ENTRIES} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#102A46] px-3.5 text-[12px] font-semibold text-white shadow-[0_3px_8px_rgba(23,49,74,0.12)] transition hover:-translate-y-px hover:bg-[#193856] hover:shadow-[0_5px_12px_rgba(23,49,74,0.17)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"><Plus className="h-3.5 w-3.5" />Agregar {kind === "sow" ? "SOW" : "suplemento"}</button>}
        </div>
      </header>

      {entries.length === 0 && kind !== "estimate" && <div className="flex min-h-[84px] items-center gap-3 px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4F6F8] text-[#9AA6AF]"><Plus className="h-4 w-4" /></span><div><p className="text-[12px] font-semibold text-[#526879]">Aún no hay {kind === "sow" ? "SOW" : "suplementos"} en este caso</p><p className="mt-1 text-[11px] text-[#81909D]">Agrega un registro cuando lo recibas o prepares.</p></div></div>}
      {entries.map((entry) => {
        const saving = savingId === `${entry.record_type}:${entry.entry_number}`;
        const label = kind === "estimate" ? "Estimado único" : `${kind === "sow" ? "SOW" : "Suplemento"} ${entry.entry_number}`;
        return <div key={`${entry.record_type}-${entry.entry_number}`} className="border-b border-[#EDF0F2] px-4 py-4 last:border-b-0 sm:px-5 sm:py-4.5">
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-[#FAFBFC] p-3 sm:grid-cols-[minmax(150px,1.05fr)_minmax(145px,1fr)_minmax(150px,1fr)_auto] sm:items-end sm:gap-3.5 sm:p-3.5">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#596D78]">{label}</p>
              {kind === "estimate" ? <label className={`group flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-[12px] font-semibold transition ${entry.estimate_sent ? "border-[#BCD7C7] bg-[#F0F7F2] text-[#477B62]" : "border-[#E1E6EA] bg-white text-[#536879] hover:border-[#CED7DE]"}`}>
                <input type="checkbox" checked={entry.estimate_sent} onChange={(event) => onChange(entry.entry_number, "estimate_sent", event.target.checked)} className="h-4 w-4 accent-[#477B62]" />
                Estimado enviado
              </label> : <div className="flex h-11 items-center rounded-lg border border-[#E8ECEF] bg-white px-3 text-[12px] font-medium text-[#596D80]">{kind === "sow" ? "Presupuesto recibido del seguro" : "Suplemento preparado"}</div>}
            </div>
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#596D78]">{kind === "estimate" ? "Monto del estimado" : "Monto"}</span><span className="flex h-11 items-center rounded-lg border border-[#E1E6EA] bg-white px-3 transition focus-within:border-[#8C6A22]/60 focus-within:ring-4 focus-within:ring-[#8C6A22]/[0.08]"><span className="mr-2 text-[13px] font-medium text-[#755613]">$</span><input type="number" min="0" step="0.01" inputMode="decimal" value={entry.amount} onChange={(event) => onChange(entry.entry_number, "amount", event.target.value)} placeholder="0.00" className="w-full bg-transparent text-[13px] font-medium tabular-nums text-[#102A46] outline-none placeholder:text-[#B0BAC2]" /></span></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#596D78]">{kind === "sow" ? "Fecha recibido" : kind === "supplement" ? "Fecha preparado" : "Fecha enviado"}</span><span className="flex h-11 items-center gap-2 rounded-lg border border-[#E1E6EA] bg-white px-3 transition focus-within:border-[#8C6A22]/60 focus-within:ring-4 focus-within:ring-[#8C6A22]/[0.08]"><CalendarDays className="h-4 w-4 shrink-0 text-[#755613]" /><input type="date" value={entry.event_date || ""} onChange={(event) => onChange(entry.entry_number, "event_date", event.target.value || null)} className="w-full bg-transparent text-[12px] font-medium text-[#536879] outline-none" /></span></label>
            <div className="flex items-center gap-2 sm:pb-0.5">
              <button type="button" onClick={() => onSave(entry)} disabled={saving} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#102A46] px-3.5 text-[12px] font-bold text-white shadow-[0_3px_8px_rgba(23,49,74,0.13)] transition hover:-translate-y-px hover:bg-[#193856] hover:shadow-[0_5px_12px_rgba(23,49,74,0.18)] disabled:cursor-wait disabled:opacity-60 sm:flex-none"><Check className="h-4 w-4" />{saving ? "Guardando" : "Guardar"}</button>
              {kind !== "estimate" && <button type="button" onClick={() => onDelete(entry)} disabled={saving} aria-label={`Eliminar ${label}`} title={`Eliminar ${label}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4E8EB] bg-white text-[#A57272] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        </div>;
      })}
    </section>
  );
}

export default function ValuesInsuranceView({ claims }: { claims: Lead[] }) {
  const activeClaims = useMemo(() => claims.filter((claim) => claim.is_insurance_claim), [claims]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [query, setQuery] = useState("");
  const [estimate, setEstimate] = useState<EntryDraft>({ record_type: "estimate", entry_number: 1, amount: "", event_date: null, estimate_sent: false });
  const [sows, setSows] = useState<EntryDraft[]>([]);
  const [supplements, setSupplements] = useState<EntryDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!activeClaims.length) {
      setSelectedClaimId("");
      return;
    }
    if (!activeClaims.some((claim) => claim.id === selectedClaimId)) setSelectedClaimId(activeClaims[0].id);
  }, [activeClaims, selectedClaimId]);

  const selectedClaim = activeClaims.find((claim) => claim.id === selectedClaimId);

  useEffect(() => {
    let cancelled = false;
    if (!selectedClaim) return;
    setLoading(true);
    setNotice(null);
    setEstimate({ record_type: "estimate", entry_number: 1, amount: "", event_date: null, estimate_sent: false });
    setSows([]);
    setSupplements([]);

    const loadEntries = async () => {
      try {
        const { data, error } = await supabase.from("admin_insurance_values").select("*").eq("lead_id", selectedClaim.id).order("record_type").order("entry_number");
        if (cancelled) return;
        if (error) {
          const message = error.code === "42P01" || error.code === "PGRST205"
            ? "Falta aplicar schema_admin_insurance_values.sql a la base de datos."
            : `No se pudieron cargar los valores: ${error.message}`;
          setNotice({ kind: "error", message });
          return;
        }
        const rows = (data || []) as ValueEntry[];
        const estimateRow = rows.find((row) => row.record_type === "estimate");
        if (estimateRow) setEstimate({ id: estimateRow.id, record_type: "estimate", entry_number: 1, amount: estimateRow.amount === null ? "" : String(estimateRow.amount), event_date: estimateRow.event_date, estimate_sent: estimateRow.estimate_sent });
        setSows(rows.filter((row) => row.record_type === "sow").map(({ id, record_type, entry_number, amount, event_date, estimate_sent }) => ({ id, record_type, entry_number, amount: amount === null ? "" : String(amount), event_date, estimate_sent })));
        setSupplements(rows.filter((row) => row.record_type === "supplement").map(({ id, record_type, entry_number, amount, event_date, estimate_sent }) => ({ id, record_type, entry_number, amount: amount === null ? "" : String(amount), event_date, estimate_sent })));
      } catch (error) {
        if (!cancelled) setNotice({ kind: "error", message: `No se pudieron cargar los valores: ${error instanceof Error ? error.message : "Error de conexión"}` });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadEntries();

    return () => { cancelled = true; };
  }, [selectedClaim?.id]);

  const updateEntry = (kind: EntryKind, entryNumber: number, field: "amount" | "event_date" | "estimate_sent", value: number | string | boolean | null) => {
    const updater = (entry: EntryDraft) => entry.entry_number === entryNumber ? { ...entry, [field]: value } : entry;
    if (kind === "estimate") setEstimate(updater);
    if (kind === "sow") setSows((rows) => rows.map(updater));
    if (kind === "supplement") setSupplements((rows) => rows.map(updater));
    setNotice(null);
  };

  const saveEntry = async (entry: EntryDraft) => {
    if (!selectedClaim?.organizationId) {
      setNotice({ kind: "error", message: "Este expediente no tiene una empresa vinculada." });
      return;
    }
    const key = `${entry.record_type}:${entry.entry_number}`;
    const amount = entry.amount.trim() === "" ? null : Number(entry.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setNotice({ kind: "error", message: "Ingresa un monto válido mayor o igual a cero." });
      return;
    }
    setSavingId(key);
    setNotice(null);
    const payload = {
      lead_id: selectedClaim.id,
      organization_id: selectedClaim.organizationId,
      record_type: entry.record_type,
      entry_number: entry.entry_number,
      amount,
      event_date: entry.event_date || null,
      estimate_sent: entry.record_type === "estimate" && entry.estimate_sent,
    };
    const { data, error } = await supabase.from("admin_insurance_values").upsert(payload, { onConflict: "lead_id,record_type,entry_number" }).select("*").single();
    if (error) {
      setNotice({ kind: "error", message: `No se pudo guardar: ${error.message}` });
    } else {
      const row = data as ValueEntry;
      const saved: EntryDraft = { id: row.id, record_type: row.record_type, entry_number: row.entry_number, amount: row.amount === null ? "" : String(row.amount), event_date: row.event_date, estimate_sent: row.estimate_sent };
      if (saved.record_type === "estimate") setEstimate(saved);
      if (saved.record_type === "sow") setSows((rows) => rows.map((item) => item.entry_number === saved.entry_number ? saved : item));
      if (saved.record_type === "supplement") setSupplements((rows) => rows.map((item) => item.entry_number === saved.entry_number ? saved : item));
      setNotice({ kind: "success", message: "Cambios guardados en el expediente." });
    }
    setSavingId(null);
  };

  const addEntry = (kind: "sow" | "supplement") => {
    const rows = kind === "sow" ? sows : supplements;
    if (rows.length >= MAX_REPEATED_ENTRIES) return;
    const occupied = new Set(rows.map((row) => row.entry_number));
    const entryNumber = [1, 2, 3, 4].find((value) => !occupied.has(value)) || rows.length + 1;
    const draft = newDraft(kind, entryNumber);
    if (kind === "sow") setSows((current) => [...current, draft].sort((a, b) => a.entry_number - b.entry_number));
    if (kind === "supplement") setSupplements((current) => [...current, draft].sort((a, b) => a.entry_number - b.entry_number));
    setNotice(null);
  };

  const deleteEntry = async (entry: EntryDraft) => {
    if (!selectedClaim) return;
    if (!entry.id) {
      if (entry.record_type === "sow") setSows((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      if (entry.record_type === "supplement") setSupplements((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      return;
    }
    const label = entry.record_type === "sow" ? `SOW ${entry.entry_number}` : `Suplemento ${entry.entry_number}`;
    if (!window.confirm(`¿Eliminar ${label} de este expediente? Esta acción no se puede deshacer.`)) return;
    const key = `${entry.record_type}:${entry.entry_number}`;
    setSavingId(key);
    setNotice(null);
    const { error } = await supabase.from("admin_insurance_values").delete().eq("id", entry.id).eq("lead_id", selectedClaim.id);
    if (error) setNotice({ kind: "error", message: `No se pudo eliminar: ${error.message}` });
    else {
      if (entry.record_type === "sow") setSows((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      if (entry.record_type === "supplement") setSupplements((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      setNotice({ kind: "success", message: "Registro eliminado del expediente." });
    }
    setSavingId(null);
  };

  return (
    <main className="crm-workspace min-h-0 flex-1 overflow-y-auto bg-[#F2F4F6]" aria-label="Valores Insurance, superadministrador">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
        <header className="relative isolate overflow-hidden rounded-[22px] border border-[#29465D] bg-[linear-gradient(112deg,#102945_0%,#102A46_58%,#1A3854_100%)] px-5 py-3.5 shadow-[0_12px_32px_rgba(23,49,74,0.16)] sm:px-6 sm:py-4">
          <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-52 w-52 rounded-full border border-[#8C6A22]/20" />
          <div className="pointer-events-none absolute -right-1 -top-11 -z-10 h-36 w-36 rounded-full border border-[#D3B566]/30" />
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(183,122,75,0.18),transparent_68%)]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#D3B566]/35 bg-[#8C6A22]/15 text-[#D5BF7A] shadow-[inset_0_1px_0_rgba(255,255,255,.1)]"><BadgeDollarSign className="h-[18px] w-[18px]" /></span>
              <div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#D3B566]">Administración de casos</p><h1 className="mt-0.5 font-display text-[23px] font-semibold tracking-[-0.04em] text-white sm:text-[25px]">Valores Insurance</h1></div>
            </div>
            <span className="ml-[58px] inline-flex w-fit items-center gap-1.5 rounded-full border border-[#D3B566]/25 bg-[#0C2036]/55 px-3 py-1.5 text-[9px] font-semibold tracking-wide text-[#D8C68A] sm:ml-0"><span className="h-1.5 w-1.5 rounded-full bg-[#D89B6D]" />Solo superadmin</span>
          </div>
        </header>

        {activeClaims.length === 0 ? <section className="rounded-[20px] border border-dashed border-[#CED7DE] bg-white px-5 py-16 text-center shadow-[0_6px_24px_rgba(23,49,74,0.035)]"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F4F6] text-[#8294A2]"><FilePlus2 className="h-5 w-5" /></span><h2 className="mt-4 font-display text-[15px] font-semibold text-[#102A46]">No hay expedientes de seguro</h2><p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-[#596D80]">Cuando la cartera tenga casos, podrás registrar sus estimados, SOW y suplementos aquí.</p></section> : <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <ClaimSelector claims={activeClaims} selectedId={selectedClaimId} onSelect={setSelectedClaimId} query={query} onQuery={setQuery} />
          <div className="min-w-0 space-y-4 sm:space-y-5">
            {selectedClaim && <section className="relative overflow-hidden rounded-[20px] border border-[#29465D] bg-[linear-gradient(112deg,#102945_0%,#102A46_62%,#1A3854_100%)] px-4 py-4 shadow-[0_10px_28px_rgba(23,49,74,0.15)] sm:px-5 sm:py-[18px]">
              <span className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-[#D3B566] via-[#8C6A22] to-[#D5BF7A]" />
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-40 w-40 rounded-full border border-[#D3B566]/15" />
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D3B566]/20 bg-[#8C6A22]/15 text-[#D5BF7A]"><FileCheck2 className="h-[17px] w-[17px]" /></span>
                  <div className="min-w-0"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#D3B566]">Expediente seleccionado</p><h2 className="mt-1 truncate font-sans text-[18px] font-semibold tracking-[-0.015em] text-white">{selectedClaim.name}</h2><p className="mt-1 truncate font-sans text-[12px] text-[#CBD6DE]">{selectedClaim.company} <span className="mx-1 text-[#D3B566]/70">·</span> {selectedClaim.insuranceProvider}</p></div>
                </div>
                <span className="ml-[52px] w-fit rounded-lg border border-[#D3B566]/25 bg-[#0C2036]/55 px-2.5 py-1.5 font-sans text-[11px] font-semibold tracking-[0.01em] text-[#D8C68A] sm:ml-0">{selectedClaim.claimNumber}</span>
              </div>
            </section>}

            {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[10px] font-medium shadow-[0_3px_12px_rgba(23,49,74,0.035)] ${notice.kind === "error" ? "border-[#F0D1D1] bg-[#FFF8F7] text-[#9E4D4D]" : "border-[#CFE2D6] bg-[#F5FAF6] text-[#477B62]"}`}>{notice.kind === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}{notice.message}</div>}

            {loading ? <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE3E8] bg-white text-[11px] font-medium text-[#596D80] shadow-[0_8px_30px_rgba(23,49,74,0.04)]"><LoaderCircle className="h-4 w-4 animate-spin text-[#755613]" />Cargando valores guardados…</div> : selectedClaim && <>
              <ValueEntryCard title="Estimado" subtitle="Solo puede registrarse un estimado por expediente." kind="estimate" entries={[estimate]} onChange={(number, field, value) => updateEntry("estimate", number, field, value)} onSave={saveEntry} onDelete={deleteEntry} savingId={savingId} />
              <ValueEntryCard title="SOW recibidos" subtitle="Presupuestos enviados por la aseguradora · máximo 4." kind="sow" entries={sows} onChange={(number, field, value) => updateEntry("sow", number, field, value)} onSave={saveEntry} onDelete={deleteEntry} savingId={savingId} onAdd={() => addEntry("sow")} />
              <ValueEntryCard title="Suplementos" subtitle="Suplementos preparados por el equipo · máximo 4." kind="supplement" entries={supplements} onChange={(number, field, value) => updateEntry("supplement", number, field, value)} onSave={saveEntry} onDelete={deleteEntry} savingId={savingId} onAdd={() => addEntry("supplement")} />
              <p className="px-1 text-[9px] leading-relaxed text-[#5C6D7D]">Cada registro se guarda en el expediente seleccionado. El botón Guardar confirma los cambios de cada fila.</p>
            </>}
          </div>
        </div>}
      </div>
    </main>
  );
}
