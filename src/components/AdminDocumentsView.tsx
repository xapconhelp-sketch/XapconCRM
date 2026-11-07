import "./admin-document-pdf.css";
import { useMemo, useState } from "react";
import { ReceiptText, ShieldCheck, Printer } from "lucide-react";
import type { Lead } from "../types";
import type { Organization } from "../contexts/AuthContext";

type DocumentKind = "invoice" | "completion";
type InvoiceAmounts = { deductible: string; acv: string; depreciation: string; nonRecoverableDepreciation: string; supplement: string; rcv: string };

const today = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const money = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "$0.00";
};

export default function AdminDocumentsView({ organizations, claims }: { organizations: Organization[]; claims: Lead[] }) {
  const contractors = useMemo(() => organizations.filter(o => !o.is_internal && o.name.toLowerCase() !== "xapcon group"), [organizations]);
  const [kind, setKind] = useState<DocumentKind>("invoice");
  const [organizationId, setOrganizationId] = useState("");
  const [claimId, setClaimId] = useState("");
  const [amounts, setAmounts] = useState<InvoiceAmounts>({ deductible: "", acv: "", depreciation: "", nonRecoverableDepreciation: "", supplement: "", rcv: "" });
  const contractor = contractors.find(o => o.id === organizationId);
  const contractorClaims = claims.filter(c => c.organizationId === organizationId);
  const claim = contractorClaims.find(c => c.id === claimId);
  const generatedDate = today();
  const setAmount = (key: keyof InvoiceAmounts, value: string) => setAmounts(previous => ({ ...previous, [key]: value }));
  const print = () => window.print();

  return <main className="admin-documents-page min-h-full overflow-y-auto p-4 md:p-7">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Documentos</h1><p className="mt-1 text-sm text-zinc-500">Prepara PDFs con la información de cada empresa y expediente.</p></div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <section className="no-print space-y-4 rounded-lg border border-zinc-200 bg-white p-4 md:p-5">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKind("invoice")} aria-pressed={kind === "invoice"} className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium ${kind === "invoice" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}><ReceiptText size={17}/>Invoice Final</button>
            <button type="button" onClick={() => setKind("completion")} aria-pressed={kind === "completion"} className={`flex min-h-12 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium ${kind === "completion" ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}><ShieldCheck size={17}/>Certificado</button>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-zinc-700">Contratista
            <select value={organizationId} onChange={e => { setOrganizationId(e.target.value); setClaimId(""); }} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-normal"><option value="">Seleccionar empresa</option>{contractors.map(o => <option key={o.id} value={o.id}>{o.company_name || o.name}</option>)}</select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-zinc-700">Homeowner / expediente
            <select value={claimId} onChange={e => setClaimId(e.target.value)} disabled={!organizationId} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 font-normal disabled:bg-zinc-100"><option value="">Seleccionar cliente</option>{contractorClaims.map(c => <option key={c.id} value={c.id}>{c.name}{c.claimNumber ? ` · ${c.claimNumber}` : ""}</option>)}</select>
          </label>
          {kind === "invoice" && <div className="grid grid-cols-2 gap-3">{([
            ["deductible", "Deducible"], ["acv", "Actual Cash Value"], ["depreciation", "Depreciation"], ["nonRecoverableDepreciation", "Non-Recoverable Depreciation"], ["supplement", "Supplement"], ["rcv", "Replacement Cost Value · Total del proyecto"],
          ] as [keyof InvoiceAmounts, string][]).map(([key, label]) => <label key={key} className="space-y-1 text-xs font-medium text-zinc-600">{label}<div className="flex h-10 items-center rounded-md border border-zinc-300 px-3"><span className="mr-2 text-zinc-400">$</span><input type="number" min="0" step="0.01" value={amounts[key]} onChange={e => setAmount(key, e.target.value)} className="w-full border-0 p-0 text-sm text-zinc-900 outline-none"/></div></label>)}</div>}
          <p className="rounded-md bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">El PDF incorpora logo, datos y color corporativo disponibles para la empresa, junto con la fecha de generación. Revisa los datos antes de imprimir o guardar como PDF.</p>
          <button type="button" disabled={!contractor || !claim} onClick={print} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Printer size={16}/>Generar PDF</button>
        </section>

        <article
          className="document-pdf-preview"
          style={{
            "--document-brand": contractor?.brand_primary_color || "#142a3b",
            "--document-accent": contractor?.brand_accent_color || contractor?.brand_primary_color || "#957548",
          } as React.CSSProperties}
        >
          <div className={`document-pdf-sheet document-pdf-sheet--${kind}`}>
            <header className="pdf-letterhead">
              <div className="pdf-issuer">
                {contractor?.logo_url ? (
                  <img src={contractor.logo_url} alt={contractor.company_name || contractor.name} />
                ) : (
                  <strong>{contractor?.company_name || contractor?.name || "Nombre de la empresa"}</strong>
                )}
              </div>
              <div className="pdf-contact">
                <p>{contractor?.company_address}</p>
                <p>{[contractor?.company_phone, contractor?.company_email].filter(Boolean).join(" · ")}</p>
              </div>
            </header>

            <div className="pdf-title">
              <h2>{kind === "invoice" ? "Invoice Final" : "Certificate of Satisfaction / Completion"}</h2>
            </div>

            <dl className="pdf-project">
              <div>
                <dt className="pdf-label">Homeowner / Property</dt>
                <dd><strong>{claim?.name || "Nombre del propietario"}</strong></dd>
                <dd>{claim?.address || "Dirección del proyecto"}</dd>
              </div>
              <div>
                <dt className="pdf-label">Insurance Claim</dt>
                <dd><strong>{claim?.claimNumber || "—"}</strong></dd>
                <dd>{claim?.insuranceProvider}</dd>
              </div>
              <div>
                <dt className="pdf-label">Date Issued</dt>
                <dd>{generatedDate}</dd>
              </div>
            </dl>

            {kind === "invoice" ? (
              <>
                <table className="pdf-amounts">
                  <thead><tr><th scope="col">Description</th><th scope="col">Amount (USD)</th></tr></thead>
                  <tbody>
                    {([
                      ["Actual Cash Value", amounts.acv],
                      ["Depreciation", amounts.depreciation],
                      ["Non-Recoverable Depreciation", amounts.nonRecoverableDepreciation],
                      ["Deductible", amounts.deductible],
                      ["Supplement", amounts.supplement],
                    ]).map(([label, value]) => (
                      <tr key={label}><th scope="row">{label}</th><td>{money(value)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><th scope="row">Replacement Cost Value</th><td>{money(amounts.rcv)}</td></tr>
                  </tfoot>
                </table>
                <section className="pdf-payment">
                  <p className="pdf-label">Please make payments to</p>
                  <strong>{contractor?.company_name || contractor?.name || "Nombre de la empresa"}</strong>
                  <p>{contractor?.company_address}</p>
                  <p>{[contractor?.company_phone, contractor?.company_email].filter(Boolean).join(" · ")}</p>
                </section>
              </>
            ) : (
              <section className="pdf-attestation">
                <div className="pdf-attestation-intro">
                  <ShieldCheck aria-hidden="true" />
                  <p>All work has been completed in full, in accordance with the approved estimate and signed roof replacement contract.</p>
                </div>
                <div className="pdf-scope">
                  <p>This document certifies that all work was performed in accordance with the scope established by the insurer.</p>
                </div>
                <p className="pdf-label">Completion Standards</p>
                <ul>
                  <li>Materials specified in the approved insurance estimate.</li>
                  <li>Installation methods that comply with current building codes.</li>
                  <li>Manufacturer installation guidelines.</li>
                  <li>Industry best practices.</li>
                </ul>
              </section>
            )}

            <footer className="pdf-colophon">
              <strong>{contractor?.company_name || contractor?.name || "Contratista"}</strong>
              {contractor?.license_number && <span>License No. {contractor.license_number}</span>}
            </footer>
          </div>
        </article>
      </div>
    </section>
  </main>;
}
