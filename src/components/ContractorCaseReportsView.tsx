import { useMemo } from "react";
import { Activity, Building2, Download, Printer } from "lucide-react";
import type { Lead } from "../types";
import type { Organization } from "../contexts/AuthContext";

interface ContractorCaseReportsViewProps {
  claims: Lead[];
  organizations: Organization[];
  activeOrganizationId?: string;
}

const REPORT_PERIOD_DAYS = 8;

function eventDate(event: Lead["timeline"][number]) {
  for (const candidate of [event.date, event.timestamp]) {
    const parsed = candidate ? Date.parse(candidate) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function lastActivity(claim: Lead) {
  return (claim.timeline || []).reduce((latest, event) => Math.max(latest, eventDate(event)), 0);
}

function formatDate(value: number | string) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(date);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  const normalized = safe.replaceAll('"', '""');
  return `"${normalized}"`;
}

function companyLabel(company: Organization) {
  return company.company_name?.trim() || company.name;
}

export default function ContractorCaseReportsView({ claims, organizations, activeOrganizationId }: ContractorCaseReportsViewProps) {
  const companies = useMemo(
    () => organizations.filter((organization) => !organization.is_internal && organization.name.trim().toLowerCase() !== "xapcon group").sort((a, b) => a.name.localeCompare(b.name)),
    [organizations],
  );
  const selectedCompany = companies.find((company) => company.id === activeOrganizationId) || null;
  const displayedCompanies = activeOrganizationId ? (selectedCompany ? [selectedCompany] : []) : companies;
  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(today.getDate() - (REPORT_PERIOD_DAYS - 1));
  periodStart.setHours(0, 0, 0, 0);
  const recentActivityCutoff = periodStart.getTime();
  const reportDate = formatDate(today.getTime());
  const reportPeriod = `${formatDate(periodStart.getTime())} – ${reportDate}`;

  const reports = useMemo(() => displayedCompanies.map((company) => ({
    company,
    claims: claims
      .filter((claim) => claim.organizationId === company.id)
      .slice()
      .sort((a, b) => lastActivity(b) - lastActivity(a)),
  })), [claims, displayedCompanies]);
  const totalCases = reports.reduce((sum, report) => sum + report.claims.length, 0);
  const recentlyUpdated = reports.reduce((sum, report) => sum + report.claims.filter((claim) => lastActivity(claim) >= recentActivityCutoff).length, 0);

  const downloadCsv = () => {
    const rows = [["Empresa contratista", "Número de caso", "Cliente", "Aseguradora", "Tipo de daño", "Estado", "Última actividad", `Actividad en últimos ${REPORT_PERIOD_DAYS} días`]];
    for (const { company, claims: companyClaims } of reports) {
      for (const claim of companyClaims) {
        const activity = lastActivity(claim);
        rows.push([
          companyLabel(company),
          claim.claimNumber || claim.id,
          claim.name,
          claim.insuranceProvider,
          claim.damageType || "",
          claim.status,
          activity ? formatDate(activity) : "Sin actividad registrada",
          activity >= recentActivityCutoff ? "Sí" : "No",
        ]);
      }
    }
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `informe-casos-${selectedCompany ? selectedCompany.name : "todas-las-empresas"}-${new Date().toISOString().slice(0, 10)}.csv`.replace(/[^\p{L}\p{N}._-]+/gu, "-");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="case-reports-screen min-h-full overflow-y-auto bg-[#F5F6F7] p-4 sm:p-7 lg:p-9">
      <style>{`
        @page { size: landscape; margin: 14mm; }
        @media print {
          body * { visibility: hidden !important; }
          .case-report-print, .case-report-print * { visibility: visible !important; }
          .case-report-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 0 !important; overflow: visible !important; background: white !important; color: #172b40 !important; }
          .case-reports-screen { min-height: 0 !important; height: auto !important; overflow: visible !important; padding: 0 !important; background: white !important; }
          .crm-main, .crm-content { display: block !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .case-report-controls { display: none !important; }
          .case-report-company + .case-report-company { break-before: page; page-break-before: always; }
          .case-report-company { break-inside: auto; }
          .case-report-table tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="case-report-print mx-auto max-w-[1400px]">
        <header className="case-report-controls mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#53677B]"><Activity className="h-4 w-4 text-[#102A46]" /> Informes para contratistas</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#102A46] sm:text-3xl">Casos por empresa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53677B]">Incluye todos los casos de cada empresa y resalta la actividad registrada en los últimos {REPORT_PERIOD_DAYS} días.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-medium text-[#607286]">{activeOrganizationId ? (selectedCompany ? `Empresa seleccionada: ${selectedCompany.name}` : "La selección actual no es una empresa contratista") : "Empresa seleccionada: todas"}</span>
            <button type="button" onClick={downloadCsv} disabled={!displayedCompanies.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D4DAE0] bg-white px-3 text-sm font-semibold text-[#102A46] transition hover:bg-[#EDF0F4] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> Descargar CSV</button>
            <button type="button" onClick={() => window.print()} disabled={!displayedCompanies.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102A46] px-3.5 text-sm font-semibold text-white transition hover:bg-[#193856] disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" /> Imprimir / guardar PDF</button>
          </div>
        </header>

        <div className="case-report-controls mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Empresas en este informe" value={displayedCompanies.length} />
          <SummaryCard label="Casos incluidos" value={totalCases} />
          <SummaryCard label="Con actividad en 8 días" value={recentlyUpdated} />
        </div>

        {!displayedCompanies.length ? <div className="rounded-xl border border-dashed border-[#C7D1DA] bg-white p-10 text-center text-sm text-[#53677B]">Selecciona una empresa contratista o “Todas las empresas” en el filtro superior.</div> : reports.map(({ company, claims: companyClaims }) => (
          <section key={company.id} className="case-report-company mb-6 overflow-hidden rounded-2xl border border-[#DDE2E7] bg-white shadow-sm">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DDE2E7] bg-[#EDF0F4] px-5 py-5 sm:px-7">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#53677B]">Informe de expedientes · {reportDate}</p><h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#102A46]"><Building2 className="h-5 w-5" /> {companyLabel(company)}</h2><p className="mt-1 text-xs text-[#53677B]">Periodo de actividad destacado: {reportPeriod}</p></div>
              <div className="flex gap-5 text-right"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#607286]">Casos</p><p className="text-2xl font-bold tabular-nums text-[#102A46]">{companyClaims.length}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#607286]">Con movimiento</p><p className="text-2xl font-bold tabular-nums text-[#102A46]">{companyClaims.filter((claim) => lastActivity(claim) >= recentActivityCutoff).length}</p></div></div>
            </header>
            {companyClaims.length ? <div className="overflow-x-auto">
              <table className="case-report-table w-full min-w-[760px] border-collapse text-left text-xs">
                <thead><tr className="bg-[#F5F6F7] text-[10px] uppercase tracking-wide text-[#53677B]"><th className="px-4 py-3 font-bold sm:px-6">Caso</th><th className="px-4 py-3 font-bold">Cliente</th><th className="px-4 py-3 font-bold">Aseguradora</th><th className="px-4 py-3 font-bold">Tipo de daño</th><th className="px-4 py-3 font-bold">Estado</th><th className="px-4 py-3 font-bold">Última actividad</th></tr></thead>
                <tbody>{companyClaims.map((claim) => {
                  const activity = lastActivity(claim);
                  const isRecent = activity >= recentActivityCutoff;
                  return <tr key={claim.id} className="border-t border-[#E5E9ED] align-top"><td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#102A46] sm:px-6">{claim.claimNumber || "Sin número"}</td><td className="max-w-56 px-4 py-3.5 font-medium text-[#26384A]">{claim.name || "Sin nombre"}</td><td className="max-w-48 px-4 py-3.5 text-[#42566B]">{claim.insuranceProvider || "Sin aseguradora"}</td><td className="max-w-40 px-4 py-3.5 text-[#42566B]">{claim.damageType || "Sin especificar"}</td><td className="px-4 py-3.5"><span className="inline-flex rounded-full bg-[#EDF0F4] px-2.5 py-1 font-semibold text-[#283D56]">{claim.status}</span></td><td className="whitespace-nowrap px-4 py-3.5 text-[#42566B]">{activity ? <>{formatDate(activity)}{isRecent && <span className="ml-2 inline-flex rounded-full bg-[#E4EAF1] px-2 py-0.5 text-[9px] font-bold text-[#15375E]">Últimos 8 días</span>}</> : "Sin actividad registrada"}</td></tr>;
                })}</tbody>
              </table>
              <p className="px-4 py-3 text-[10px] text-[#607286] sm:px-6">Se muestran todos los casos de la empresa. El indicador destaca los casos con actividad reciente.</p>
            </div> : <p className="px-6 py-12 text-center text-sm text-[#607286]">No hay casos registrados para esta empresa.</p>}
          </section>
        ))}
        <p className="case-report-controls text-center text-[10px] text-[#607286]">Informe generado desde Xapcon CRM · Información correspondiente a cada empresa contratista</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#DDE2E7] bg-white px-4 py-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#607286]">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#102A46]">{value}</p></div>;
}
