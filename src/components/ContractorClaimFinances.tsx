import React from "react";
import { Check, CircleAlert, Clock3, DollarSign, ExternalLink, FileText, LoaderCircle, Paperclip, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { calculateClaimFinanceTotals, parseFinanceAmount, validateClaimFinanceAmounts, validateClaimFinancePayment } from "../lib/claimFinance.js";

type ClaimAmounts = {
  rcv: string;
  acv: string;
  deductible: string;
  recoverable_depreciation: string;
  non_recoverable_depreciation: string;
  notes: string;
};

type PaymentType = "first_check" | "second_check" | "depreciation" | "deductible" | "supplement" | "other";
type PayerType = "insurance" | "homeowner" | "other";
type PaymentStatus = "expected" | "received";
type PaymentRow = {
  id: string;
  payment_type: PaymentType;
  payer_type: PayerType;
  status: PaymentStatus;
  amount: number;
  expected_date: string | null;
  received_date: string | null;
  reference: string;
  notes: string;
  receipt_path: string | null;
  receipt_name: string | null;
  created_at: string;
};

type PaymentForm = Omit<PaymentRow, "id" | "created_at" | "amount"> & { amount: string };

const emptyAmounts: ClaimAmounts = {
  rcv: "",
  acv: "",
  deductible: "",
  recoverable_depreciation: "",
  non_recoverable_depreciation: "",
  notes: "",
};

const emptyPayment: PaymentForm = {
  payment_type: "first_check",
  payer_type: "insurance",
  status: "expected",
  amount: "",
  expected_date: "",
  received_date: "",
  reference: "",
  notes: "",
  receipt_path: null,
  receipt_name: null,
};

const paymentTypeLabels: Record<PaymentType, string> = {
  first_check: "Primer cheque",
  second_check: "Segundo cheque",
  depreciation: "Depreciación recuperada",
  deductible: "Deducible",
  supplement: "Suplemento",
  other: "Otro pago",
};
const payerLabels: Record<PayerType, string> = { insurance: "Aseguradora", homeowner: "Propietario", other: "Otro" };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(value) ? value : 0);
export default function ContractorClaimFinances({ claimId, organizationId }: { claimId: string; organizationId?: string }) {
  const [amounts, setAmounts] = React.useState<ClaimAmounts>(emptyAmounts);
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [financeExists, setFinanceExists] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [savingAmounts, setSavingAmounts] = React.useState(false);
  const [savingPayment, setSavingPayment] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [paymentFormOpen, setPaymentFormOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<PaymentRow | null>(null);
  const [paymentForm, setPaymentForm] = React.useState<PaymentForm>(emptyPayment);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = React.useState(false);

  const loadFinancials = React.useCallback(async () => {
    if (!organizationId) {
      setErrorMessage("Este reclamo no tiene una empresa asociada. No se pueden cargar sus finanzas.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    const [amountResult, paymentResult] = await Promise.all([
      supabase.from("contractor_claim_financials").select("*").eq("claim_id", claimId).eq("organization_id", organizationId).maybeSingle(),
      supabase.from("contractor_claim_payments").select("*").eq("claim_id", claimId).eq("organization_id", organizationId).order("status", { ascending: true }).order("expected_date", { ascending: true, nullsFirst: false }).order("received_date", { ascending: false, nullsFirst: false }),
    ]);
    if (amountResult.error || paymentResult.error) {
      setErrorMessage(`No se pudieron cargar las finanzas del reclamo. ${amountResult.error?.message || paymentResult.error?.message || ""}`.trim());
      setLoading(false);
      return;
    }
    const row = amountResult.data;
    setFinanceExists(Boolean(row));
    setAmounts(row ? {
      rcv: String(row.rcv ?? ""),
      acv: String(row.acv ?? ""),
      deductible: String(row.deductible ?? ""),
      recoverable_depreciation: String(row.recoverable_depreciation ?? ""),
      non_recoverable_depreciation: String(row.non_recoverable_depreciation ?? ""),
      notes: row.notes || "",
    } : emptyAmounts);
    setPayments((paymentResult.data || []) as PaymentRow[]);
    setStatusMessage("");
    setLoading(false);
  }, [claimId, organizationId]);

  React.useEffect(() => { void loadFinancials(); }, [loadFinancials]);

  const totals = React.useMemo(() => calculateClaimFinanceTotals(payments), [payments]);

  const saveAmounts = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationId) return;
    const validationError = validateClaimFinanceAmounts(amounts);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setSavingAmounts(true);
    setErrorMessage("");
    setStatusMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("contractor_claim_financials").upsert({
      claim_id: claimId,
      organization_id: organizationId,
      rcv: parseFinanceAmount(amounts.rcv),
      acv: parseFinanceAmount(amounts.acv),
      deductible: parseFinanceAmount(amounts.deductible),
      recoverable_depreciation: parseFinanceAmount(amounts.recoverable_depreciation),
      non_recoverable_depreciation: parseFinanceAmount(amounts.non_recoverable_depreciation),
      notes: amounts.notes.trim(),
      updated_by: user?.id || null,
      ...(!financeExists ? { created_by: user?.id || null } : {}),
    }, { onConflict: "claim_id" });
    if (error) setErrorMessage(`No se pudieron guardar los montos. ${error.message}`);
    else setStatusMessage("Montos guardados en Supabase.");
    setSavingAmounts(false);
  };

  const startNewPayment = () => {
    setEditingPayment(null);
    setPaymentForm({ ...emptyPayment, received_date: new Date().toISOString().slice(0, 10) });
    setReceiptFile(null);
    setRemoveExistingReceipt(false);
    setErrorMessage("");
    setPaymentFormOpen(true);
  };

  const startEditPayment = (payment: PaymentRow) => {
    setEditingPayment(payment);
    setPaymentForm({
      payment_type: payment.payment_type,
      payer_type: payment.payer_type,
      status: payment.status,
      amount: String(payment.amount),
      expected_date: payment.expected_date || "",
      received_date: payment.received_date || "",
      reference: payment.reference || "",
      notes: payment.notes || "",
      receipt_path: payment.receipt_path || null,
      receipt_name: payment.receipt_name || null,
    });
    setReceiptFile(null);
    setRemoveExistingReceipt(false);
    setErrorMessage("");
    setPaymentFormOpen(true);
  };

  const savePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationId) return;
    const validationError = validateClaimFinancePayment(paymentForm);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const amount = Number(paymentForm.amount);
    setSavingPayment(true);
    setErrorMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const paymentId = editingPayment?.id || crypto.randomUUID();
    let uploadedReceiptPath: string | null = null;
    if (receiptFile) {
      const receiptType = getReceiptContentType(receiptFile);
      if (!receiptType) {
        setErrorMessage("El recibo debe ser un archivo PDF o JPEG.");
        setSavingPayment(false);
        return;
      }
      if (receiptFile.size > 10 * 1024 * 1024) {
        setErrorMessage("El recibo no puede superar 10 MB.");
        setSavingPayment(false);
        return;
      }
      const safeFileName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || `receipt.${receiptType === "application/pdf" ? "pdf" : "jpg"}`;
      uploadedReceiptPath = `${organizationId}/${claimId}/${paymentId}/${Date.now()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("contractor-payment-receipts")
        .upload(uploadedReceiptPath, receiptFile, { contentType: receiptType, upsert: false });
      if (uploadError) {
        setErrorMessage(`No se pudo adjuntar el recibo. ${uploadError.message}`);
        setSavingPayment(false);
        return;
      }
    }
    const receiptPath = uploadedReceiptPath || (removeExistingReceipt ? null : paymentForm.receipt_path);
    const receiptName = uploadedReceiptPath ? receiptFile?.name || null : removeExistingReceipt ? null : paymentForm.receipt_name;
    const payload = {
      ...paymentForm,
      id: paymentId,
      amount,
      expected_date: paymentForm.expected_date || null,
      received_date: paymentForm.status === "received" ? (paymentForm.received_date || new Date().toISOString().slice(0, 10)) : null,
      reference: paymentForm.reference.trim(),
      notes: paymentForm.notes.trim(),
      receipt_path: receiptPath,
      receipt_name: receiptName,
      claim_id: claimId,
      organization_id: organizationId,
      updated_by: user?.id || null,
    };
    const result = editingPayment
      ? await supabase.from("contractor_claim_payments").update(payload).eq("id", editingPayment.id).eq("claim_id", claimId)
      : await supabase.from("contractor_claim_payments").insert({ ...payload, created_by: user?.id || null });
    if (result.error) {
      if (uploadedReceiptPath) {
        await supabase.storage.from("contractor-payment-receipts").remove([uploadedReceiptPath]);
      }
      setErrorMessage(`No se pudo guardar el pago. ${result.error.message}`);
      setSavingPayment(false);
      return;
    }
    const oldReceiptPath = editingPayment?.receipt_path;
    if (oldReceiptPath && oldReceiptPath !== receiptPath) {
      await supabase.storage.from("contractor-payment-receipts").remove([oldReceiptPath]);
    }
    setPaymentFormOpen(false);
    setReceiptFile(null);
    setRemoveExistingReceipt(false);
    await loadFinancials();
    setStatusMessage(editingPayment ? "Pago actualizado en Supabase." : "Pago registrado en Supabase.");
    setSavingPayment(false);
  };

  const deletePayment = async (payment: PaymentRow) => {
    if (!window.confirm(`¿Eliminar el registro de ${money(Number(payment.amount))}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("contractor_claim_payments").delete().eq("id", payment.id).eq("claim_id", claimId);
    if (error) {
      setErrorMessage(`No se pudo eliminar el pago. ${error.message}`);
      return;
    }
    if (payment.receipt_path) {
      await supabase.storage.from("contractor-payment-receipts").remove([payment.receipt_path]);
    }
    await loadFinancials();
    setStatusMessage("Registro de pago eliminado.");
  };

  const openPaymentReceipt = async (payment: PaymentRow) => {
    if (!payment.receipt_path) return;
    const receiptWindow = window.open("about:blank", "_blank");
    const { data, error } = await supabase.storage
      .from("contractor-payment-receipts")
      .createSignedUrl(payment.receipt_path, 60 * 5);
    if (error || !data?.signedUrl) {
      receiptWindow?.close();
      setErrorMessage(`No se pudo abrir el recibo. ${error?.message || "Inténtalo de nuevo."}`);
      return;
    }
    if (receiptWindow) receiptWindow.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  };

  if (loading) return <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm font-medium text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando finanzas del reclamo…</div>;

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-[#DCE3E5] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#EDF0F0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A6653E]">Finanzas del proyecto</p><h3 className="mt-1 text-base font-bold text-[#17314A]">Montos del reclamo</h3><p className="mt-1 text-xs text-slate-500">Captura valores de seguro y seguimiento de cobros. Los totales se calculan con los pagos registrados.</p></div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#EEF5F1] px-3 py-1.5 text-[10px] font-bold text-[#36705E]"><DollarSign className="h-3.5 w-3.5" /> USD</span>
      </div>
      <div className="grid gap-3 border-b border-[#EDF0F0] bg-[#FAFBFA] p-4 sm:grid-cols-3 sm:p-5">
        <TotalCard label="RCV aprobado" value={money(parseFinanceAmount(amounts.rcv))} icon={<ReceiptText className="h-4 w-4" />} />
        <TotalCard label="Pagos recibidos" value={money(totals.received)} icon={<Check className="h-4 w-4" />} />
        <TotalCard label="Cobros por recibir" value={money(totals.expected)} icon={<Clock3 className="h-4 w-4" />} />
      </div>
      <form onSubmit={saveAmounts} className="space-y-5 p-5 sm:p-6">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-[#526574]">Valores aprobados por aseguradora</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AmountField label="RCV" value={amounts.rcv} onChange={value => setAmounts(prev => ({ ...prev, rcv: value }))} />
            <AmountField label="ACV" value={amounts.acv} onChange={value => setAmounts(prev => ({ ...prev, acv: value }))} />
            <AmountField label="Deducible" value={amounts.deductible} onChange={value => setAmounts(prev => ({ ...prev, deductible: value }))} />
            <AmountField label="Depreciación recuperable" value={amounts.recoverable_depreciation} onChange={value => setAmounts(prev => ({ ...prev, recoverable_depreciation: value }))} />
            <AmountField label="Depreciación no recuperable" value={amounts.non_recoverable_depreciation} onChange={value => setAmounts(prev => ({ ...prev, non_recoverable_depreciation: value }))} />
          </div>
        </div>
        <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#526574]">Notas financieras</span><textarea value={amounts.notes} onChange={event => setAmounts(prev => ({ ...prev, notes: event.target.value }))} rows={2} maxLength={1500} placeholder="Notas sobre el alcance aprobado, pagos o documentación financiera…" className="w-full resize-y rounded-xl border border-[#DCE2E3] px-3 py-2.5 text-sm text-[#17314A] outline-none placeholder:text-slate-400 focus:border-[#A6653E] focus:ring-2 focus:ring-[#A6653E]/15" /></label>
        <div className="flex flex-col gap-2 border-t border-[#EDF0F0] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-xs">{errorMessage && !paymentFormOpen ? <span className="inline-flex items-center gap-1.5 font-medium text-[#B5493B]"><CircleAlert className="h-3.5 w-3.5" /> {errorMessage}</span> : statusMessage && !paymentFormOpen ? <span className="font-semibold text-[#36705E]">{statusMessage}</span> : <span className="text-slate-500">Los valores aprobados se guardan por separado del flujo administrativo.</span>}</div>
          <button type="submit" disabled={savingAmounts} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17314A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#25435B] disabled:opacity-50">{savingAmounts ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Guardando…</> : <><Check className="h-4 w-4" /> Guardar montos</>}</button>
        </div>
      </form>
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#DCE3E5] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#EDF0F0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h3 className="text-sm font-bold text-[#17314A]">Pagos y cobros</h3><p className="mt-1 text-[11px] text-slate-500">Cada movimiento distingue lo esperado de lo recibido, quién paga y en qué fecha.</p></div>
        <button onClick={startNewPayment} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#D8E0E3] bg-white px-3.5 py-2.5 text-xs font-bold text-[#31566E] transition hover:border-[#A6653E] hover:bg-[#FBF7F3]"><Plus className="h-4 w-4" /> Registrar pago</button>
      </div>
      {errorMessage && paymentFormOpen && <p role="alert" className="mx-5 mt-4 rounded-xl bg-[#FCEDEA] px-3 py-2.5 text-xs font-medium text-[#B5493B] sm:mx-6">{errorMessage}</p>}
      {payments.length === 0 ? <div className="flex min-h-[150px] flex-col items-center justify-center px-6 py-8 text-center"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F5F4] text-[#71818A]"><ReceiptText className="h-5 w-5" /></div><p className="text-xs font-bold text-[#17314A]">Todavía no hay pagos registrados</p><p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-500">Registra pagos esperados o recibidos para mantener claro el saldo del proyecto.</p></div> : (
        <div className="divide-y divide-[#F0F2F2]">
          {payments.map(payment => <article key={payment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-bold text-[#17314A]">{paymentTypeLabels[payment.payment_type]}</h4><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${payment.status === "received" ? "bg-[#EAF4EF] text-[#36705E]" : "bg-[#FBF3E8] text-[#96652B]"}`}>{payment.status === "received" ? "Recibido" : "Esperado"}</span></div>
              <p className="mt-1 truncate text-[10px] text-slate-500">{payerLabels[payment.payer_type]}{payment.reference ? ` · ${payment.reference}` : ""}</p>
              <p className="mt-1 text-[10px] text-slate-500">{payment.status === "received" ? `Recibido ${formatDate(payment.received_date)}` : payment.expected_date ? `Esperado ${formatDate(payment.expected_date)}` : "Sin fecha esperada"}{payment.notes ? ` · ${payment.notes}` : ""}</p>
              {payment.receipt_path && <button type="button" onClick={() => void openPaymentReceipt(payment)} className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#F3F6F7] px-2.5 py-1.5 text-[10px] font-semibold text-[#31566E] transition hover:bg-[#E9EFF1]"><Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{payment.receipt_name || "Ver recibo"}</span><ExternalLink className="h-3 w-3 shrink-0" /></button>}
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end"><p className="text-sm font-bold tabular-nums text-[#17314A]">{money(Number(payment.amount))}</p><button onClick={() => startEditPayment(payment)} aria-label={`Editar ${paymentTypeLabels[payment.payment_type]}`} className="rounded-lg p-2 text-slate-500 hover:bg-[#F3F5F4] hover:text-[#17314A]"><Pencil className="h-4 w-4" /></button><button onClick={() => void deletePayment(payment)} aria-label={`Eliminar ${paymentTypeLabels[payment.payment_type]}`} className="rounded-lg p-2 text-slate-500 hover:bg-[#FCEDEA] hover:text-[#B5493B]"><Trash2 className="h-4 w-4" /></button></div>
          </article>)}
        </div>
      )}
      {statusMessage && !paymentFormOpen && <p aria-live="polite" className="border-t border-[#EDF0F0] px-5 py-3 text-xs font-semibold text-[#36705E] sm:px-6">{statusMessage}</p>}
    </section>

    {paymentFormOpen && <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#102333]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !savingPayment) setPaymentFormOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="payment-form-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-[#EDF0F0] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A6653E]">Control de cobros</p><h3 id="payment-form-title" className="mt-1 text-lg font-bold text-[#17314A]">{editingPayment ? "Editar pago" : "Registrar pago"}</h3></div><button type="button" onClick={() => setPaymentFormOpen(false)} disabled={savingPayment} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-[#F3F5F4]"><X className="h-4 w-4" /></button></div>
        <form onSubmit={savePayment} className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Concepto" value={paymentForm.payment_type} onChange={value => setPaymentForm(prev => ({ ...prev, payment_type: value as PaymentType }))}>{Object.entries(paymentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
            <SelectField label="Quién paga" value={paymentForm.payer_type} onChange={value => setPaymentForm(prev => ({ ...prev, payer_type: value as PayerType }))}>{Object.entries(payerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
            <SelectField label="Estado" value={paymentForm.status} onChange={value => setPaymentForm(prev => ({ ...prev, status: value as PaymentStatus, received_date: value === "received" ? prev.received_date || new Date().toISOString().slice(0, 10) : "" }))}><option value="expected">Esperado</option><option value="received">Recibido</option></SelectField>
            <AmountField label="Monto (USD)" value={paymentForm.amount} onChange={value => setPaymentForm(prev => ({ ...prev, amount: value }))} required />
            {paymentForm.status === "expected" ? <FormField label="Fecha esperada" type="date" value={paymentForm.expected_date || ""} onChange={value => setPaymentForm(prev => ({ ...prev, expected_date: value }))} /> : <FormField label="Fecha de recepción" type="date" value={paymentForm.received_date || ""} onChange={value => setPaymentForm(prev => ({ ...prev, received_date: value }))} required />}
            <FormField label="Referencia / cheque" value={paymentForm.reference || ""} onChange={value => setPaymentForm(prev => ({ ...prev, reference: value }))} maxLength={120} />
          </div>
          <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#526574]">Notas</span><textarea value={paymentForm.notes || ""} onChange={event => setPaymentForm(prev => ({ ...prev, notes: event.target.value }))} rows={2} maxLength={1000} className="w-full resize-y rounded-xl border border-[#DCE2E3] px-3 py-2.5 text-sm text-[#17314A] outline-none focus:border-[#A6653E] focus:ring-2 focus:ring-[#A6653E]/15" /></label>
          <div className="rounded-xl border border-dashed border-[#CBD6DB] bg-[#FAFBFB] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#A6653E] shadow-sm"><FileText className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-[#31566E]">Recibo del pago <span className="font-medium text-slate-400">(opcional)</span></span>
                <span className="mt-0.5 block text-[10px] text-slate-500">Adjunta un archivo PDF o JPEG de hasta 10 MB.</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" onChange={event => { setReceiptFile(event.target.files?.[0] || null); if (event.target.files?.[0]) setRemoveExistingReceipt(false); }} className="mt-2 block w-full text-[10px] text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#31566E]" />
              </span>
            </label>
            {receiptFile && <p className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[10px] font-medium text-[#526574]"><span className="truncate">Nuevo: {receiptFile.name}</span><button type="button" onClick={() => setReceiptFile(null)} className="shrink-0 font-bold text-[#B5493B]">Quitar</button></p>}
            {paymentForm.receipt_path && !removeExistingReceipt && !receiptFile && <p className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[10px] font-medium text-[#526574]"><span className="truncate">Adjunto: {paymentForm.receipt_name || "Recibo guardado"}</span><button type="button" onClick={() => setRemoveExistingReceipt(true)} className="shrink-0 font-bold text-[#B5493B]">Quitar recibo</button></p>}
            {removeExistingReceipt && <p className="mt-2 text-[10px] font-semibold text-[#B5493B]">El recibo se eliminará al guardar el pago.</p>}
          </div>
          {errorMessage && <p role="alert" className="rounded-xl bg-[#FCEDEA] px-3 py-2.5 text-xs font-medium text-[#B5493B]">{errorMessage}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-[#EDF0F0] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPaymentFormOpen(false)} disabled={savingPayment} className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#526574] hover:bg-[#F3F5F4]">Cancelar</button><button type="submit" disabled={savingPayment} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17314A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#25435B] disabled:opacity-50">{savingPayment ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Guardando…</> : <><Check className="h-4 w-4" /> Guardar pago</>}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}

function TotalCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-[#E6EBEB] bg-white px-4 py-3"><div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">{icon}{label}</div><p className="mt-1.5 text-xl font-bold tracking-tight text-[#17314A]">{value}</p></div>;
}

function AmountField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <FormField label={label} value={value} onChange={onChange} type="number" min="0" step="0.01" required={required} prefix="$" />;
}

function FormField({ label, value, onChange, type = "text", min, step, maxLength, required = false, prefix }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string; maxLength?: number; required?: boolean; prefix?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#526574]">{label}</span><span className="relative block">{prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{prefix}</span>}<input type={type} min={min} step={step} maxLength={maxLength} required={required} value={value} onChange={event => onChange(event.target.value)} className={`w-full rounded-xl border border-[#DCE2E3] ${prefix ? "pl-7" : "px-3"} py-2.5 text-sm text-[#17314A] outline-none focus:border-[#A6653E] focus:ring-2 focus:ring-[#A6653E]/15`} /></span></label>;
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#526574]">{label}</span><select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded-xl border border-[#DCE2E3] bg-white px-3 py-2.5 text-sm text-[#17314A] outline-none focus:border-[#A6653E] focus:ring-2 focus:ring-[#A6653E]/15">{children}</select></label>;
}

function formatDate(value: string | null) {
  if (!value) return "sin fecha";
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("es-US", { month: "short", day: "numeric", year: "numeric" }).format(date) : value;
}

function getReceiptContentType(file: File): "application/pdf" | "image/jpeg" | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") return "application/pdf";
  if (file.type === "image/jpeg" || extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return null;
}
