import { useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Wallet, Landmark, BriefcaseBusiness, ChartNoAxesCombined, AlertTriangle, Upload, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { queryAll } from "../lib/queryAll.js";

type Section = "Resumen" | "Suplementos" | "Cobros" | "Costos" | "Comisiones";
type Supplement = { id: string; requested: number; approved: number; submittedDate: string; approvalDate: string; fee: number };
type PaymentStatus = "expected" | "in_transit" | "held_by_mortgage" | "received" | "deposited" | "rejected";
type Payment = { id: string; type: string; amount: number; status: PaymentStatus; receivedDate: string; mortgage: boolean; mortgageCompany: string; receiptPath: string; receiptName: string; receipt?: File };
type Cost = { id: string; category: string; vendor: string; invoiceNumber: string; amount: number; credit: boolean; paid: boolean; paidDate: string; invoicePath: string; invoiceName: string; invoice?: File };

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const initialSupplements: Supplement[] = [];
const initialPayments: Payment[] = [];
const initialCosts: Cost[] = [];
const blankPayment = (type = "first_check"): Payment => ({ id: crypto.randomUUID(), type, amount: 0, status: "expected", receivedDate: "", mortgage: false, mortgageCompany: "", receiptPath: "", receiptName: "" });
const blankSupplement = (): Supplement => ({ id: crypto.randomUUID(), requested: 0, approved: 0, submittedDate: "", approvalDate: "", fee: 0 });
const blankCost = (): Cost => ({ id: crypto.randomUUID(), category: "Otro", vendor: "", invoiceNumber: "", amount: 0, credit: false, paid: false, paidDate: "", invoicePath: "", invoiceName: "" });
const paymentTypes = [
  ["first_check", "Primer pago ACV"], ["second_check", "Pago de ACV"], ["depreciation", "Depreciación recuperada"],
  ["deductible", "Deducible"], ["supplement", "Pago de suplemento"], ["other", "Otro pago"],
] as const;
const paymentStatuses: { value: PaymentStatus; label: string }[] = [
  { value: "expected", label: "Esperado" }, { value: "in_transit", label: "En tránsito" },
  { value: "held_by_mortgage", label: "Retenido por el banco hipotecario" }, { value: "received", label: "Recibido" },
  { value: "deposited", label: "Depositado" }, { value: "rejected", label: "Rechazado" },
];

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange?: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-medium text-slate-500">{label}<input type={type} value={value} onChange={event => onChange?.(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#8C6A22]" /></label>;
}

function SectionTitle({ title, detail, action, onSave, saving }: { title: string; detail: string; action?: () => void; onSave?: () => void; saving?: boolean }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-base font-bold text-[#102A46]">{title}</h3><p className="mt-1 text-xs text-slate-500">{detail}</p></div><div className="flex gap-2">{action && <button onClick={action} className="inline-flex items-center gap-1.5 rounded-lg bg-[#102A46] px-3 py-2 text-xs font-semibold text-white"><Plus className="size-4"/>Agregar</button>}{onSave && <button onClick={onSave} disabled={saving} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A46] disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>}</div></div>;
}

export default function ClaimFinancialModule({ claimId, organizationId }: { claimId: string; organizationId: string }) {
  const [section, setSection] = useState<Section>("Resumen");
  const [rcv, setRcv] = useState(0);
  const [acv, setAcv] = useState(0);
  const [deductible, setDeductible] = useState(0);
  const [recoverableDepreciation, setRecoverableDepreciation] = useState(0);
  const [nonRecoverableDepreciation, setNonRecoverableDepreciation] = useState(0);
  const [opAmount, setOpAmount] = useState(0);
  const [retail, setRetail] = useState(0);
  const [squares, setSquares] = useState(0);
  const [claimApprovalDate, setClaimApprovalDate] = useState("");
  const [constructionDate, setConstructionDate] = useState("");
  const [depreciationReleaseDate, setDepreciationReleaseDate] = useState("");
  const [contractSignedDate, setContractSignedDate] = useState("");
  const [cocSentDate, setCocSentDate] = useState("");
  const [supplements, setSupplements] = useState(initialSupplements);
  const [payments, setPayments] = useState(initialPayments);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [costs, setCosts] = useState(initialCosts);
  const [invoiceUrls, setInvoiceUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [overhead, setOverhead] = useState(10);
  const [split, setSplit] = useState(50);
  const [draw, setDraw] = useState(1000);
  const [rep, setRep] = useState("Jordan Lee");

  useEffect(() => {
    let current = true;
    const load = async () => {
      setLoading(true);
      setError("");
      const [financeResult, supplementResult, paymentResult, costResult] = await Promise.all([
        supabase.from("contractor_claim_financials").select("*").eq("claim_id", claimId).eq("organization_id", organizationId).maybeSingle(),
        queryAll((from, to) => supabase.from("contractor_claim_supplements").select("*").eq("claim_id", claimId).eq("organization_id", organizationId).order("created_at").range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_payments").select("*").eq("claim_id", claimId).eq("organization_id", organizationId).order("created_at").range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_costs").select("*").eq("claim_id", claimId).eq("organization_id", organizationId).order("created_at").range(from, to)),
      ]);
      if (!current) return;
      const loadError = financeResult.error || supplementResult.error || paymentResult.error || costResult.error;
      if (loadError) {
        setError(`No se pudieron cargar los datos financieros. ${loadError.message}`);
        setLoading(false);
        return;
      }
      const finance = financeResult.data;
      setRcv(Number(finance?.rcv || 0));
      setAcv(Number(finance?.acv || 0));
      setDeductible(Number(finance?.deductible || 0));
      setRecoverableDepreciation(Number(finance?.recoverable_depreciation || 0));
      setNonRecoverableDepreciation(Number(finance?.non_recoverable_depreciation || 0));
      setOpAmount(Number(finance?.op_amount || 0));
      setRetail(Number(finance?.retail_upgrades || 0));
      setSquares(Number(finance?.total_squares || 0));
      setClaimApprovalDate(finance?.approval_date || "");
      setConstructionDate(finance?.construction_date || "");
      setDepreciationReleaseDate(finance?.depreciation_release_date || "");
      setContractSignedDate(finance?.contract_signed_date || "");
      setCocSentDate(finance?.coc_sent_date || "");
      setSupplements((supplementResult.data || []).map((row: any) => ({ id: row.id, requested: Number(row.requested_amount), approved: Number(row.approved_amount), submittedDate: row.submitted_date || "", approvalDate: row.approval_date || "", fee: Number(row.fee_amount) })));
      const loadedPayments: Payment[] = (paymentResult.data || []).map((row: any) => ({ id: row.id, type: row.payment_type, amount: Number(row.amount), status: row.status, receivedDate: row.received_date || "", mortgage: Boolean(row.mortgage_endorsement), mortgageCompany: row.mortgage_company || "", receiptPath: row.receipt_path || "", receiptName: row.receipt_name || "" }));
      setPayments(loadedPayments);
      const receiptEntries = await Promise.all(loadedPayments.filter(row => row.receiptPath).map(async row => {
        const { data } = await supabase.storage.from("contractor-payment-receipts").createSignedUrl(row.receiptPath, 60 * 10);
        return data?.signedUrl ? [row.id, data.signedUrl] as const : null;
      }));
      if (!current) return;
      setReceiptUrls(Object.fromEntries(receiptEntries.filter((entry): entry is readonly [string, string] => entry !== null)));
      const loadedCosts: Cost[] = (costResult.data || []).map((row: any) => ({ id: row.id, category: row.category, vendor: row.vendor, invoiceNumber: row.invoice_number || "", amount: Number(row.amount), credit: Boolean(row.is_return_credit), paid: Boolean(row.is_paid), paidDate: row.paid_date || "", invoicePath: row.invoice_path || "", invoiceName: row.invoice_name || "" }));
      const invoiceEntries = await Promise.all(loadedCosts.filter(row => row.invoicePath).map(async row => {
        const { data } = await supabase.storage.from("contractor-payment-receipts").createSignedUrl(row.invoicePath, 60 * 10);
        return data?.signedUrl ? [row.id, data.signedUrl] as const : null;
      }));
      if (!current) return;
      setInvoiceUrls(Object.fromEntries(invoiceEntries.filter((entry): entry is readonly [string, string] => entry !== null)));
      setCosts(loadedCosts);
      setLoading(false);
    };
    void load();
    return () => { current = false; };
  }, [claimId, organizationId]);

  const approved = supplements.reduce((sum, row) => sum + row.approved, 0);
  const contract = rcv + approved + retail;
  const collected = payments.filter(row => row.status === "deposited" || row.status === "received").reduce((sum, row) => sum + row.amount, 0);
  const held = payments.filter(row => row.status === "held_by_mortgage" || row.status === "in_transit").reduce((sum, row) => sum + row.amount, 0);
  const costsTotal = costs.reduce((sum, row) => sum + (row.credit ? -row.amount : row.amount), 0) + supplements.reduce((sum, row) => sum + row.fee, 0);
  const gross = contract - costsTotal;
  const netSplit = gross - contract * overhead / 100;
  const commission = Math.max(0, netSplit * split / 100);
  const feeTotal = useMemo(() => supplements.reduce((sum, row) => sum + row.fee, 0), [supplements]);
  const addSupplement = () => setSupplements(rows => [...rows, blankSupplement()]);
  const addPayment = () => setPayments(rows => [...rows, blankPayment("supplement")]);
  const addCost = () => setCosts(rows => [...rows, blankCost()]);
  const saveSummary = async () => {
    setSaving(true); setError(""); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error: saveError } = await supabase.from("contractor_claim_financials").upsert({
      claim_id: claimId, organization_id: organizationId, rcv, acv, deductible,
      recoverable_depreciation: recoverableDepreciation, non_recoverable_depreciation: nonRecoverableDepreciation,
      op_amount: opAmount, retail_upgrades: retail, total_squares: squares,
      approval_date: claimApprovalDate || null, construction_date: constructionDate || null,
      depreciation_release_date: depreciationReleaseDate || null, contract_signed_date: contractSignedDate || null,
      coc_sent_date: cocSentDate || null, updated_by: user?.id || null,
    }, { onConflict: "claim_id" });
    if (saveError) setError(`No se pudo guardar el resumen. ${saveError.message}`);
    else setMessage("Resumen guardado.");
    setSaving(false);
  };
  const saveSupplements = async () => {
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = supplements.length ? await supabase.from("contractor_claim_supplements").upsert(supplements.map(row => ({
      id: row.id, claim_id: claimId, organization_id: organizationId,
      requested_amount: row.requested, approved_amount: row.approved,
      submitted_date: row.submittedDate || null, approval_date: row.approvalDate || null, fee_amount: row.fee,
    })), { onConflict: "id" }) : { error: null };
    if (saveError) setError(`No se pudieron guardar los suplementos. ${saveError.message}`);
    else setMessage("Suplementos guardados.");
    setSaving(false);
  };
  const savePayments = async () => {
    if (payments.some(row => row.amount <= 0)) { setError("Cada pago debe tener un monto mayor que cero antes de guardarlo."); return; }
    if (payments.some(row => ["received", "deposited"].includes(row.status) && !row.receivedDate)) { setError("Indica la fecha de recepción para los pagos recibidos o depositados."); return; }
    setSaving(true); setError(""); setMessage("");
    const uploadedPaths: string[] = [];
    const rows = [];
    for (const row of payments) {
      let receiptPath = row.receiptPath || null;
      let receiptName = row.receiptName || null;
      if (row.receipt) {
        if (!new Set(["image/jpeg", "image/png", "application/pdf"]).has(row.receipt.type)) { setError("El comprobante debe ser JPEG, PNG o PDF."); setSaving(false); return; }
        if (row.receipt.size > 10 * 1024 * 1024) { setError("El comprobante no puede superar 10 MB."); setSaving(false); return; }
        const safeName = row.receipt.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
        receiptPath = `${organizationId}/${claimId}/${row.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("contractor-payment-receipts").upload(receiptPath, row.receipt, { contentType: row.receipt.type, upsert: false });
        if (uploadError) {
          if (uploadedPaths.length) await supabase.storage.from("contractor-payment-receipts").remove(uploadedPaths);
          setError(`No se pudo subir el comprobante. ${uploadError.message}`); setSaving(false); return;
        }
        uploadedPaths.push(receiptPath);
        receiptName = row.receipt.name;
      }
      rows.push({ id: row.id, claim_id: claimId, organization_id: organizationId, payment_type: row.type, payer_type: row.type === "deductible" || row.type === "other" ? "homeowner" : "insurance", amount: row.amount, status: row.status, received_date: row.receivedDate || null, mortgage_endorsement: row.mortgage, mortgage_company: row.mortgageCompany, receipt_path: receiptPath, receipt_name: receiptName });
    }
    const { error: saveError } = rows.length ? await supabase.from("contractor_claim_payments").upsert(rows, { onConflict: "id" }) : { error: null };
    if (saveError) {
      if (uploadedPaths.length) await supabase.storage.from("contractor-payment-receipts").remove(uploadedPaths);
      setError(`No se pudieron guardar los pagos. ${saveError.message}`);
    } else {
      const replacedReceipts = payments.filter(row => row.receiptPath && rows.some(saved => saved.id === row.id && saved.receipt_path !== row.receiptPath)).map(row => row.receiptPath);
      if (replacedReceipts.length) await supabase.storage.from("contractor-payment-receipts").remove(replacedReceipts);
      const savedPayments: Payment[] = rows.map(row => ({ id: row.id, type: row.payment_type, amount: row.amount, status: row.status as PaymentStatus, receivedDate: row.received_date || "", mortgage: row.mortgage_endorsement, mortgageCompany: row.mortgage_company, receiptPath: row.receipt_path || "", receiptName: row.receipt_name || "" }));
      setPayments(savedPayments);
      const receiptEntries = await Promise.all(savedPayments.filter(row => row.receiptPath).map(async row => {
        const { data } = await supabase.storage.from("contractor-payment-receipts").createSignedUrl(row.receiptPath, 60 * 10);
        return data?.signedUrl ? [row.id, data.signedUrl] as const : null;
      }));
      setReceiptUrls(Object.fromEntries(receiptEntries.filter((entry): entry is readonly [string, string] => entry !== null)));
      setMessage("Pagos y comprobantes guardados.");
    }
    setSaving(false);
  };
  const saveCosts = async () => {
    setSaving(true); setError(""); setMessage("");
    const uploadedPaths: string[] = [];
    const rows = [];
    for (const row of costs) {
      let invoicePath = row.invoicePath || null;
      let invoiceName = row.invoiceName || null;
      if (row.invoice) {
        if (!new Set(["image/jpeg", "image/png", "application/pdf"]).has(row.invoice.type)) { setError("La factura debe ser JPEG, PNG o PDF."); setSaving(false); return; }
        if (row.invoice.size > 10 * 1024 * 1024) { setError("La factura no puede superar 10 MB."); setSaving(false); return; }
        const safeName = row.invoice.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
        invoicePath = `${organizationId}/${claimId}/${row.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("contractor-payment-receipts").upload(invoicePath, row.invoice, { contentType: row.invoice.type, upsert: false });
        if (uploadError) {
          if (uploadedPaths.length) await supabase.storage.from("contractor-payment-receipts").remove(uploadedPaths);
          setError(`No se pudo subir la factura. ${uploadError.message}`); setSaving(false); return;
        }
        uploadedPaths.push(invoicePath);
        invoiceName = row.invoice.name;
      }
      rows.push({ id: row.id, claim_id: claimId, organization_id: organizationId, category: row.category,
        vendor: row.vendor, invoice_number: row.invoiceNumber, amount: row.amount,
        is_return_credit: row.credit, is_paid: row.paid, paid_date: row.paid ? row.paidDate || null : null,
        invoice_path: invoicePath, invoice_name: invoiceName });
    }
    const { error: saveError } = rows.length ? await supabase.from("contractor_claim_costs").upsert(rows, { onConflict: "id" }) : { error: null };
    if (saveError) {
      if (uploadedPaths.length) await supabase.storage.from("contractor-payment-receipts").remove(uploadedPaths);
      setError(`No se pudieron guardar los costos. ${saveError.message}`);
    } else {
      const replaced = costs.filter(row => row.invoicePath && rows.some(saved => saved.id === row.id && saved.invoice_path !== row.invoicePath)).map(row => row.invoicePath);
      if (replaced.length) await supabase.storage.from("contractor-payment-receipts").remove(replaced);
      const savedCosts: Cost[] = rows.map(row => ({ id: row.id, category: row.category, vendor: row.vendor, invoiceNumber: row.invoice_number, amount: row.amount, credit: row.is_return_credit, paid: row.is_paid, paidDate: row.paid_date || "", invoicePath: row.invoice_path || "", invoiceName: row.invoice_name || "" }));
      setCosts(savedCosts);
      const entries = await Promise.all(savedCosts.filter(row => row.invoicePath).map(async row => {
        const { data } = await supabase.storage.from("contractor-payment-receipts").createSignedUrl(row.invoicePath, 60 * 10);
        return data?.signedUrl ? [row.id, data.signedUrl] as const : null;
      }));
      setInvoiceUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null)));
      setMessage("Costos y facturas guardados.");
    }
    setSaving(false);
  };
  const removeSupplement = async (row: Supplement) => {
    const { error: deleteError } = await supabase.from("contractor_claim_supplements").delete().eq("id", row.id).eq("claim_id", claimId).eq("organization_id", organizationId);
    if (deleteError) { setError(`No se pudo eliminar el suplemento. ${deleteError.message}`); return; }
    setSupplements(rows => rows.filter(item => item.id !== row.id)); setMessage("Suplemento eliminado."); setError("");
  };
  const removePayment = async (row: Payment) => {
    const { error: deleteError } = await supabase.from("contractor_claim_payments").delete().eq("id", row.id).eq("claim_id", claimId).eq("organization_id", organizationId);
    if (deleteError) { setError(`No se pudo eliminar el pago. ${deleteError.message}`); return; }
    if (row.receiptPath) await supabase.storage.from("contractor-payment-receipts").remove([row.receiptPath]);
    setPayments(rows => rows.filter(item => item.id !== row.id));
    setReceiptUrls(urls => { const next = { ...urls }; delete next[row.id]; return next; });
    setMessage("Pago eliminado."); setError("");
  };
  const removeCost = async (row: Cost) => {
    const { error: deleteError } = await supabase.from("contractor_claim_costs").delete().eq("id", row.id).eq("claim_id", claimId).eq("organization_id", organizationId);
    if (deleteError) { setError(`No se pudo eliminar el costo. ${deleteError.message}`); return; }
    if (row.invoicePath) await supabase.storage.from("contractor-payment-receipts").remove([row.invoicePath]);
    setCosts(rows => rows.filter(item => item.id !== row.id));
    setInvoiceUrls(urls => { const next = { ...urls }; delete next[row.id]; return next; });
    setMessage("Costo eliminado."); setError("");
  };
  const sections: { name: Section; icon: typeof Wallet }[] = [{ name: "Resumen", icon: ChartNoAxesCombined }, { name: "Suplementos", icon: Receipt }, { name: "Cobros", icon: Wallet }, { name: "Costos", icon: BriefcaseBusiness }, { name: "Comisiones", icon: Landmark }];

  return <div className="space-y-5" aria-label="Módulo financiero del siniestro">
    {loading && <p role="status" className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Cargando datos guardados…</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1" aria-label="Secciones financieras">{sections.map(({ name, icon: Icon }) => <button key={name} onClick={() => setSection(name)} aria-pressed={section === name} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${section === name ? "bg-[#102A46] text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="size-4" />{name}</button>)}</nav>
    {section === "Resumen" && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><SectionTitle title="Datos del siniestro" detail="Valores financieros y datos del techo." onSave={saveSummary} saving={saving}/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="RCV inicial" type="number" value={rcv} onChange={v => setRcv(+v)}/><Field label="ACV inicial" type="number" value={acv} onChange={v => setAcv(+v)}/><Field label="Deducible" type="number" value={deductible} onChange={v => setDeductible(+v)}/><Field label="Depreciación recuperable" type="number" value={recoverableDepreciation} onChange={v=>setRecoverableDepreciation(+v)}/><Field label="Depreciación no recuperable" type="number" value={nonRecoverableDepreciation} onChange={v=>setNonRecoverableDepreciation(+v)}/><Field label="Monto de O&P" type="number" value={opAmount} onChange={v=>setOpAmount(+v)}/><Field label="Total de mejoras de bolsillo" type="number" value={retail} onChange={v => setRetail(+v)}/><Field label="Cuadrados totales (SQ)" type="number" value={squares} onChange={v => setSquares(+v)}/><Field label="Fecha de firma del contrato" type="date" value={contractSignedDate} onChange={setContractSignedDate}/><Field label="Fecha de aprobación del reclamo" type="date" value={claimApprovalDate} onChange={setClaimApprovalDate}/><Field label="Fecha de construcción" type="date" value={constructionDate} onChange={setConstructionDate}/><Field label="Fecha de envío del COC" type="date" value={cocSentDate} onChange={setCocSentDate}/><Field label="Fecha de liberación de la depreciación" type="date" value={depreciationReleaseDate} onChange={setDepreciationReleaseDate}/></div><p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">RCV por cuadrado <b>{money(squares ? rcv / squares : 0)}</b> · Costo por cuadrado <b>{money(squares ? costsTotal / squares : 0)}</b></p></div>}
    {section === "Suplementos" && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><SectionTitle title="Seguimiento de suplementos" detail="Registra solicitudes, aprobaciones y honorarios." action={addSupplement} onSave={saveSupplements} saving={saving}/><div className="space-y-2">{supplements.map((row, i) => <div key={row.id} className="rounded-xl bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold text-[#102A46]">Suplemento #{i + 1}</h4><button onClick={() => void removeSupplement(row)} aria-label={`Eliminar suplemento ${i + 1}`} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4"/></button></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><Field label="Monto solicitado" type="number" value={row.requested} onChange={v => setSupplements(a=>a.map((r,j)=>j===i?{...r,requested:+v}:r))}/><Field label="Monto aprobado" type="number" value={row.approved} onChange={v=>setSupplements(a=>a.map((r,j)=>j===i?{...r,approved:+v}:r))}/><Field label="Fecha de envío" type="date" value={row.submittedDate} onChange={v=>setSupplements(a=>a.map((r,j)=>j===i?{...r,submittedDate:v}:r))}/><Field label="Fecha de aprobación" type="date" value={row.approvalDate} onChange={v=>setSupplements(a=>a.map((r,j)=>j===i?{...r,approvalDate:v}:r))}/><Field label="Honorarios totales ($)" type="number" value={row.fee} onChange={v=>setSupplements(a=>a.map((r,j)=>j===i?{...r,fee:+v}:r))}/></div></div>)}</div><p className="text-xs text-slate-600">Total solicitado {money(supplements.reduce((s,r)=>s+r.requested,0))} · Total aprobado {money(approved)} · Tasa de aprobación {supplements.reduce((s,r)=>s+r.requested,0)?(approved/supplements.reduce((s,r)=>s+r.requested,0)*100).toFixed(0):0}% · Honorarios {money(feeTotal)}</p></div>}
    {section === "Cobros" && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <SectionTitle title="Cobros y retención hipotecaria" detail="Controla los pagos esperados, recibidos y retenidos." action={addPayment} onSave={savePayments} saving={saving}/>
      {payments.map((row, i) => <div key={i} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-slate-500">Tipo de pago<select value={row.type} onChange={e => setPayments(a => a.map((r, j) => j === i ? { ...r, type: e.target.value } : r))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{paymentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <Field label="Monto" type="number" value={row.amount} onChange={v => setPayments(a => a.map((r, j) => j === i ? { ...r, amount: +v } : r))}/>
        <label className="text-xs text-slate-500">Estado<select value={row.status} onChange={e => setPayments(a => a.map((r, j) => j === i ? { ...r, status: e.target.value as PaymentStatus } : r))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{paymentStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
        <Field label="Fecha de recepción" type="date" value={row.receivedDate} onChange={v => setPayments(a => a.map((r, j) => j === i ? { ...r, receivedDate: v } : r))}/>
        <label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-600"><input type="checkbox" title="Actívalo si el cheque debe enviarse al banco hipotecario para que lo endose antes de depositarlo." checked={row.mortgage} onChange={e => setPayments(a => a.map((r, j) => j === i ? { ...r, mortgage: e.target.checked } : r))}/>Requiere endoso hipotecario</label>
        <label className="block text-xs font-medium text-slate-500">Comprobante
          <span className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#102A46] px-3 py-2 text-xs font-semibold text-white hover:bg-[#183c61] focus-within:ring-2 focus-within:ring-[#8C6A22] focus-within:ring-offset-2"><Upload className="size-4"/>{row.receipt ? "Cambiar comprobante" : "Adjuntar comprobante"}<input type="file" accept="image/jpeg,image/png,application/pdf" aria-label="Adjuntar comprobante en JPEG, PNG o PDF" onChange={e => { const receipt = e.target.files?.[0]; if (receipt) setPayments(a => a.map((r, j) => j === i ? { ...r, receipt } : r)); }} className="sr-only"/></span>
          {row.receipt ? <span className="mt-1 block max-w-full truncate text-[10px]">{row.receipt.name}</span> : row.receiptName && receiptUrls[row.id] ? <a className="mt-1 block max-w-full truncate text-[10px] text-[#174a75] underline" href={receiptUrls[row.id]} target="_blank" rel="noreferrer">Ver comprobante · {row.receiptName}</a> : <span className="mt-1 block max-w-full truncate text-[10px]">JPEG, PNG o PDF</span>}
        </label>
        {row.mortgage && <Field label="Entidad hipotecaria" value={row.mortgageCompany} onChange={v => setPayments(a => a.map((r, j) => j === i ? { ...r, mortgageCompany: v } : r))}/>}
        <button onClick={() => void removePayment(row)} className="inline-flex items-center gap-1 self-end rounded-lg px-2 py-2 text-xs text-red-700 hover:bg-red-50"><Trash2 className="size-4"/>Eliminar pago</button>
      </div>)}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600">Total cobrado {money(collected)} · En tránsito o retenido {money(held)} · Deducible pendiente {money(Math.max(0, deductible - payments.filter(p => p.type === "deductible" && (p.status === "received" || p.status === "deposited")).reduce((s, p) => s + p.amount, 0)))}</div>
    </div>}
    {section === "Costos" && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><SectionTitle title="Costos directos" detail="Registra el valor final facturado o pagado. Marca el crédito si el proveedor devuelve dinero." action={addCost} onSave={saveCosts} saving={saving}/>{costs.map((row,i)=><div key={row.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Categoría de costo" value={row.category} onChange={v=>setCosts(a=>a.map((r,j)=>j===i?{...r,category:v}:r))}/><Field label="Proveedor" value={row.vendor} onChange={v=>setCosts(a=>a.map((r,j)=>j===i?{...r,vendor:v}:r))}/><Field label="Número de factura" value={row.invoiceNumber} onChange={v=>setCosts(a=>a.map((r,j)=>j===i?{...r,invoiceNumber:v}:r))}/><Field label="Valor" type="number" value={row.amount} onChange={v=>setCosts(a=>a.map((r,j)=>j===i?{...r,amount:+v}:r))}/><label className="block text-xs font-medium text-slate-500">Factura<span className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#102A46] px-3 py-2 text-xs font-semibold text-white hover:bg-[#183c61] focus-within:ring-2 focus-within:ring-[#8C6A22]"><Upload className="size-4"/>{row.invoice ? "Cambiar factura" : "Adjuntar factura"}<input type="file" accept="image/jpeg,image/png,application/pdf" aria-label="Adjuntar factura en JPEG, PNG o PDF" onChange={e=>{const invoice=e.target.files?.[0];if(invoice)setCosts(a=>a.map((r,j)=>j===i?{...r,invoice}:r));}} className="sr-only"/></span>{row.invoice ? <span className="mt-1 block max-w-full truncate text-[10px]">{row.invoice.name}</span> : row.invoicePath && invoiceUrls[row.id] ? <a className="mt-1 block max-w-full truncate text-[10px] text-[#174a75] underline" href={invoiceUrls[row.id]} target="_blank" rel="noreferrer">Ver factura · {row.invoiceName}</a> : <span className="mt-1 block text-[10px]">JPEG, PNG o PDF</span>}</label><label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-600"><input type="checkbox" checked={row.credit} onChange={e=>setCosts(a=>a.map((r,j)=>j===i?{...r,credit:e.target.checked}:r))}/>Crédito por devolución</label><label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-600"><input type="checkbox" checked={row.paid} onChange={e=>setCosts(a=>a.map((r,j)=>j===i?{...r,paid:e.target.checked}:r))}/>Pagado al proveedor</label>{row.paid&&<Field label="Fecha de pago" type="date" value={row.paidDate} onChange={v=>setCosts(a=>a.map((r,j)=>j===i?{...r,paidDate:v}:r))}/>}<button onClick={() => void removeCost(row)} aria-label="Eliminar costo" className="inline-flex items-center gap-1 self-end rounded-lg px-2 py-2 text-xs text-red-700 hover:bg-red-50"><Trash2 className="size-4"/>Eliminar</button></div>)}<p className="text-xs text-slate-600">Costo registrado {money(costs.reduce((s,r)=>s+r.amount,0))} · Costo neto {money(costsTotal)} · Costo por cuadrado {money(squares?costsTotal/squares:0)}</p></div>}
    {section === "Comisiones" && <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><SectionTitle title="Liquidación de comisión" detail="Modelo 10/50/50 calculado en tiempo real."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Representante de ventas" value={rep} onChange={setRep}/><Field label="Gastos generales de la empresa (%)" type="number" value={overhead} onChange={v=>setOverhead(+v)}/><Field label="Porcentaje del representante (%)" type="number" value={split} onChange={v=>setSplit(+v)}/><Field label="Adelanto pagado" type="number" value={draw} onChange={v=>setDraw(+v)}/></div><div className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-4"><p className="py-3 text-sm">Valor total del contrato <b className="float-right">{money(contract)}</b></p><p className="py-3 text-sm">Costo neto del trabajo, incluidos honorarios <b className="float-right">−{money(costsTotal)}</b></p><p className="py-3 text-sm">Utilidad bruta <b className="float-right">{money(gross)}</b></p><p className="py-3 text-sm">Gastos generales de la empresa ({overhead}%) <b className="float-right">−{money(contract*overhead/100)}</b></p><p className="py-3 text-sm">Utilidad neta para dividir <b className="float-right">{money(netSplit)}</b></p><p className="py-3 text-sm font-bold text-[#102A46]">Comisión final · {rep} <b className="float-right">{money(commission)}</b></p></div><p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="size-4"/>Saldo de comisión {money(Math.max(0,commission-draw))} · Adelanto {money(draw)} · Estado: Pendiente de cobro</p></div>}
  </div>;
}
