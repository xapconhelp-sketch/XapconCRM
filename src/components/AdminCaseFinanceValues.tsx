import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Check, CheckCircle2, LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { Lead } from "../types";
import { supabase } from "../lib/supabase";

type RecordType = "estimate" | "sow" | "supplement";
type Entry = {
  id?: string;
  lead_id: string;
  organization_id: string;
  record_type: RecordType;
  entry_number: number;
  amount: string;
  event_date: string | null;
  estimate_sent: boolean;
};
type StoredEntry = Omit<Entry, "amount"> & { amount: number | null };
const CAPACITY: Record<"sow" | "supplement", number> = { sow: 5, supplement: 2 };
const emptyEntry = (claim: Lead, recordType: RecordType, entryNumber: number): Entry => ({
  lead_id: claim.id,
  organization_id: claim.organizationId || "",
  record_type: recordType,
  entry_number: entryNumber,
  amount: "",
  event_date: null,
  estimate_sent: false,
});

export default function AdminCaseFinanceValues({ claim }: { claim: Lead }) {
  const [estimate, setEstimate] = useState<Entry>(() => emptyEntry(claim, "estimate", 1));
  const [sows, setSows] = useState<Entry[]>([]);
  const [supplements, setSupplements] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEstimate(emptyEntry(claim, "estimate", 1));
    setSows([]);
    setSupplements([]);
    setNotice(null);
    setLoading(true);
    const load = async () => {
      const { data, error } = await supabase.from("admin_insurance_values")
        .select("id,lead_id,organization_id,record_type,entry_number,amount,event_date,estimate_sent")
        .eq("lead_id", claim.id)
        .in("record_type", ["estimate", "sow", "supplement"])
        .order("record_type").order("entry_number");
      if (cancelled) return;
      if (error) {
        setNotice({ kind: "error", message: error.code === "42P01" || error.code === "PGRST205" ? "Falta aplicar schema_admin_insurance_values.sql a la base de datos." : `No se pudieron cargar los valores: ${error.message}` });
        setLoading(false);
        return;
      }
      const rows = (data || []) as StoredEntry[];
      const convert = (row: StoredEntry): Entry => ({ ...row, amount: row.amount === null ? "" : String(row.amount) });
      const estimateRow = rows.find(row => row.record_type === "estimate" && row.entry_number === 1);
      setEstimate(estimateRow ? convert(estimateRow) : emptyEntry(claim, "estimate", 1));
      setSows(rows.filter(row => row.record_type === "sow" && row.entry_number <= CAPACITY.sow).map(convert));
      setSupplements(rows.filter(row => row.record_type === "supplement" && row.entry_number <= CAPACITY.supplement).map(convert));
      setLoading(false);
    };
    void load().catch(error => {
      if (cancelled) return;
      setNotice({ kind: "error", message: `No se pudieron cargar los valores: ${error instanceof Error ? error.message : "Error de conexión"}` });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [claim.id, claim.organizationId]);

  const update = (recordType: RecordType, entryNumber: number, changes: Partial<Entry>) => {
    const updateRow = (row: Entry) => row.entry_number === entryNumber ? { ...row, ...changes } : row;
    if (recordType === "estimate") setEstimate(current => ({ ...current, ...changes }));
    if (recordType === "sow") setSows(current => current.map(updateRow));
    if (recordType === "supplement") setSupplements(current => current.map(updateRow));
    setNotice(null);
  };
  const save = async (entry: Entry) => {
    if (!claim.organizationId) return setNotice({ kind: "error", message: "Este expediente no tiene una empresa vinculada." });
    const amount = entry.amount.trim() === "" ? null : Number(entry.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return setNotice({ kind: "error", message: "Ingresa un monto válido mayor o igual a cero." });
    const key = `${entry.record_type}:${entry.entry_number}`;
    setSavingKey(key);
    setNotice(null);
    try {
      const { data, error } = await supabase.from("admin_insurance_values").upsert({
        lead_id: claim.id,
        organization_id: claim.organizationId,
        record_type: entry.record_type,
        entry_number: entry.entry_number,
        amount,
        event_date: entry.event_date || null,
        estimate_sent: entry.record_type === "estimate" && entry.estimate_sent,
      }, { onConflict: "lead_id,record_type,entry_number" })
        .select("id,lead_id,organization_id,record_type,entry_number,amount,event_date,estimate_sent").single();
      if (error) throw error;
      const saved = data as StoredEntry;
      const next = { ...saved, amount: saved.amount === null ? "" : String(saved.amount) };
      if (saved.record_type === "estimate") setEstimate(next);
      if (saved.record_type === "sow") setSows(current => current.map(row => row.entry_number === saved.entry_number ? next : row));
      if (saved.record_type === "supplement") setSupplements(current => current.map(row => row.entry_number === saved.entry_number ? next : row));
      setNotice({ kind: "success", message: `${saved.record_type === "estimate" ? "Estimado" : `${saved.record_type === "sow" ? "SOW" : "Suplemento"} ${saved.entry_number}`} guardado.` });
    } catch (error) {
      setNotice({ kind: "error", message: `No se pudo guardar: ${error instanceof Error ? error.message : "Error de conexión"}` });
    } finally {
      setSavingKey(null);
    }
  };
  const addRow = (recordType: "sow" | "supplement") => {
    const rows = recordType === "sow" ? sows : supplements;
    const nextNumber = Array.from({ length: CAPACITY[recordType] }, (_, index) => index + 1).find(number => !rows.some(row => row.entry_number === number));
    if (!nextNumber) return;
    const next = [...rows, emptyEntry(claim, recordType, nextNumber)].sort((a, b) => a.entry_number - b.entry_number);
    if (recordType === "sow") setSows(next); else setSupplements(next);
  };
  const removeRow = async (entry: Entry) => {
    if (!entry.id) {
      if (entry.record_type === "sow") setSows(rows => rows.filter(row => row.entry_number !== entry.entry_number));
      if (entry.record_type === "supplement") setSupplements(rows => rows.filter(row => row.entry_number !== entry.entry_number));
      return;
    }
    const label = `${entry.record_type === "sow" ? "SOW" : "Suplemento"} ${entry.entry_number}`;
    if (!window.confirm(`¿Eliminar ${label} de este expediente? Esta acción no se puede deshacer.`)) return;
    const key = `${entry.record_type}:${entry.entry_number}`;
    setSavingKey(key);
    try {
      const { error } = await supabase.from("admin_insurance_values").delete().eq("id", entry.id).eq("lead_id", claim.id);
      if (error) throw error;
      if (entry.record_type === "sow") setSows(rows => rows.filter(row => row.entry_number !== entry.entry_number));
      if (entry.record_type === "supplement") setSupplements(rows => rows.filter(row => row.entry_number !== entry.entry_number));
      setNotice({ kind: "success", message: `${label} eliminado.` });
    } catch (error) {
      setNotice({ kind: "error", message: `No se pudo eliminar: ${error instanceof Error ? error.message : "Error de conexión"}` });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-2xl border border-[#DDE3E8] bg-white text-sm text-[#596D80]"><LoaderCircle className="h-4 w-4 animate-spin" />Cargando valores registrados…</div>;

  const renderCard = (title: string, recordType: "estimate" | "sow" | "supplement", rows: Entry[], capacity?: number) => (
    <section className="admin-finance-card">
      <header className="admin-finance-card-header">
        <div className="admin-finance-card-heading"><h3>{title}</h3><span>{capacity ? `${rows.length} / ${capacity}` : "Único"}</span></div>
        {capacity && recordType !== "estimate" && <button type="button" onClick={() => addRow(recordType)} disabled={rows.length >= capacity} className="admin-finance-add"><Plus className="h-3.5 w-3.5" />Agregar</button>}
      </header>
      {!rows.length && <p className="admin-finance-empty">Aún no hay valores registrados.</p>}
      <div className="admin-finance-rows">{rows.map(entry => {
        const key = `${entry.record_type}:${entry.entry_number}`;
        const label = entry.record_type === "estimate" ? "Estimado" : `${entry.record_type === "sow" ? "SOW" : "Suplemento"} ${entry.entry_number}`;
        const busy = savingKey === key;
        const dateLabel = entry.record_type === "estimate" ? "Fecha enviado" : entry.record_type === "sow" ? "Fecha recibido" : "Fecha preparado";
        return <div key={key} className="admin-finance-row">
          <div className="admin-finance-entry-name"><strong>{label}</strong>{entry.record_type === "estimate" && <label><input type="checkbox" checked={entry.estimate_sent} onChange={event => update("estimate", 1, { estimate_sent: event.target.checked })} />Enviado</label>}</div>
          <label className="admin-finance-field"><span>Monto</span><span className="admin-finance-input"><b>$</b><input aria-label={`${label} monto`} type="number" min="0" step="0.01" value={entry.amount} onChange={event => update(entry.record_type, entry.entry_number, { amount: event.target.value })} placeholder="0.00" /></span></label>
          <label className="admin-finance-field"><span>{dateLabel}</span><span className="admin-finance-input admin-finance-date"><CalendarDays className="h-3.5 w-3.5" /><input aria-label={`${label} fecha`} type="date" value={entry.event_date || ""} onChange={event => update(entry.record_type, entry.entry_number, { event_date: event.target.value || null })} /></span></label>
          <div className="admin-finance-actions"><button type="button" onClick={() => void save(entry)} disabled={busy || (!entry.id && !entry.amount.trim() && !entry.event_date && !entry.estimate_sent)} className="admin-finance-save"><Check className="h-3.5 w-3.5" />{busy ? "Guardando…" : "Guardar"}</button>{entry.record_type !== "estimate" && <button type="button" onClick={() => void removeRow(entry)} disabled={busy} aria-label={`Eliminar ${label}`} title={`Eliminar ${label}`} className="admin-finance-delete"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
        </div>;
      })}</div>
    </section>
  );

  return <section className="space-y-4" aria-label={`Finanzas de ${claim.name}`}>
    {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[11px] ${notice.kind === "error" ? "border-red-100 bg-red-50 text-red-800" : "border-emerald-100 bg-emerald-50 text-emerald-800"}`}>{notice.kind === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{notice.message}</div>}
    {renderCard("Estimado", "estimate", [estimate])}
    {renderCard("SOW recibidos", "sow", sows, CAPACITY.sow)}
    {renderCard("Suplementos", "supplement", supplements, CAPACITY.supplement)}
  </section>;
}
