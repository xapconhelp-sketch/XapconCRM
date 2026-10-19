import { useMemo, useState } from "react";
import { Activity, Building2, CalendarDays, Download, FileText, House, ListTodo, MessageCircle, PhoneCall, Printer, ShieldCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import type { AdminClaimRecord, AdminHomeownerContact, Lead } from "../types";
import type { Organization } from "../contexts/AuthContext";
import logoXapcon from "../assets/optimized/logo-xapcon.webp";

interface ContractorCaseReportsViewProps {
  claims: Lead[];
  organizations: Organization[];
  activeOrganizationId?: string;
}

const REPORT_TIME_ZONE = "America/Bogota";
const EXCLUDED_REPORT_STATUSES = new Set(["finalizado", "cancelado", "cancelados", "negado", "negados"]);
const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: REPORT_TIME_ZONE });

function isIncludedInReport(claim: Lead) {
  return !EXCLUDED_REPORT_STATUSES.has(claim.status.trim().toLocaleLowerCase("es-CO"));
}

function dateKeyFromDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: REPORT_TIME_ZONE,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateKey(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? dateKeyFromDate(new Date(parsed)) : "";
}

function shiftDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function currentWeekRange(today = new Date()) {
  const todayKey = dateKeyFromDate(today);
  const [year, month, day] = todayKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const monday = shiftDateKey(todayKey, -((weekday + 6) % 7));
  return { start: monday, end: shiftDateKey(monday, 6) };
}

function weekRangeFromValue(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return currentWeekRange();
  const year = Number(match[1]);
  const weekNumber = Number(match[2]);
  if (weekNumber < 1 || weekNumber > 53) return currentWeekRange();
  const januaryFourth = `${year}-01-04`;
  const [januaryYear, januaryMonth, januaryDay] = januaryFourth.split("-").map(Number);
  const januaryWeekday = new Date(Date.UTC(januaryYear, januaryMonth - 1, januaryDay, 12)).getUTCDay();
  const firstMonday = shiftDateKey(januaryFourth, -((januaryWeekday + 6) % 7));
  const monday = shiftDateKey(firstMonday, (weekNumber - 1) * 7);
  const thursday = shiftDateKey(monday, 3);
  if (Number(thursday.slice(0, 4)) !== year) return currentWeekRange();
  return { start: monday, end: shiftDateKey(monday, 6) };
}

function weekValueForDate(date = new Date()) {
  const monday = currentWeekRange(date).start;
  const thursday = shiftDateKey(monday, 3);
  const weekYear = Number(thursday.slice(0, 4));
  const januaryFourth = `${weekYear}-01-04`;
  const [year, month, day] = januaryFourth.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const firstMonday = shiftDateKey(januaryFourth, -((weekday + 6) % 7));
  const weekNumber = Math.floor((Date.parse(`${monday}T00:00:00Z`) - Date.parse(`${firstMonday}T00:00:00Z`)) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
}

function formatDate(value?: string | number) {
  if (value === undefined || value === null || value === "") return "Sin registro";
  const input = String(value);
  const parsed = typeof value === "number"
    ? new Date(value)
    : /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? new Date(`${input}T12:00:00-05:00`)
      : new Date(input);
  return Number.isNaN(parsed.getTime()) ? "Sin registro" : DATE_FORMATTER.format(parsed);
}

function weekLabel(range: { start: string; end: string }) {
  return `${formatDate(range.start)} – ${formatDate(range.end)}`;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function companyLabel(company: Organization) {
  return company.company_name?.trim() || company.name;
}

function newestRecord(records: AdminClaimRecord[], type: AdminClaimRecord["type"]) {
  return records
    .filter((record) => record.type === type && dateKey(record.date))
    .reduce<AdminClaimRecord | undefined>((latest, record) => {
      if (!latest) return record;
      const currentDate = dateKey(record.date);
      const latestDate = dateKey(latest.date);
      if (currentDate !== latestDate) return currentDate > latestDate ? record : latest;
      return (record.createdAt || "") > (latest.createdAt || "") ? record : latest;
    }, undefined);
}

function newestHomeownerContact(contacts: AdminHomeownerContact[]) {
  return contacts
    .filter((contact) => dateKey(contact.contactedAt))
    .reduce<AdminHomeownerContact | undefined>((latest, contact) => {
      if (!latest) return contact;
      const currentDate = dateKey(contact.contactedAt);
      const latestDate = dateKey(latest.contactedAt);
      if (currentDate !== latestDate) return currentDate > latestDate ? contact : latest;
      return (contact.createdAt || "") > (latest.createdAt || "") ? contact : latest;
    }, undefined);
}

function countWeeklyManagement(claim: Lead, range: { start: string; end: string }) {
  const records = claim.adminClaimRecords || [];
  const insuranceActivityCount = records.filter((record) =>
    (record.type === "insurance_call" || record.type === "insurance_response")
      && dateKey(record.date) >= range.start
      && dateKey(record.date) <= range.end,
  ).length;
  const legacyResponseKey = dateKey(claim.adminActivity?.lastInsuranceResponseAt);
  const legacyResponseCount = legacyResponseKey >= range.start && legacyResponseKey <= range.end
    && !records.some((record) => record.type === "insurance_response" && dateKey(record.date) === legacyResponseKey)
    ? 1
    : 0;
  const homeownerContactCount = (claim.adminHomeownerContacts || []).filter((contact) =>
    dateKey(contact.contactedAt) >= range.start && dateKey(contact.contactedAt) <= range.end,
  ).length;
  return insuranceActivityCount + legacyResponseCount + homeownerContactCount;
}

function activityText(record?: AdminClaimRecord) {
  if (!record) return "Sin registro";
  return [formatDate(record.date), record.note.trim()].filter(Boolean).join(" · ");
}

function lastInsuranceResponseText(claim: Lead) {
  const record = newestRecord(claim.adminClaimRecords || [], "insurance_response");
  const legacyDate = claim.adminActivity?.lastInsuranceResponseAt;
  if (!record) return legacyDate ? formatDate(legacyDate) : "Sin registro";
  return legacyDate && dateKey(legacyDate) > dateKey(record.date)
    ? formatDate(legacyDate)
    : activityText(record);
}

function homeownerText(contact?: AdminHomeownerContact) {
  if (!contact) return "Sin registro";
  const channels: Record<AdminHomeownerContact["channels"][number], string> = {
    call: "Llamada", email: "Correo", sms: "SMS",
  };
  const channelText = contact.channels.map((channel) => channels[channel]).filter(Boolean).join(", ");
  return [formatDate(contact.contactedAt), channelText, contact.note.trim()].filter(Boolean).join(" · ");
}

function latestCaseManagementDateKey(claim: Lead) {
  const keys = [
    dateKey(newestRecord(claim.adminClaimRecords || [], "insurance_response")?.date),
    dateKey(newestRecord(claim.adminClaimRecords || [], "insurance_call")?.date),
    dateKey(newestHomeownerContact(claim.adminHomeownerContacts || [])?.contactedAt),
  ].filter(Boolean);
  return keys.sort().at(-1) || "";
}

export default function ContractorCaseReportsView({ claims, organizations, activeOrganizationId }: ContractorCaseReportsViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(() => weekValueForDate());
  const companies = useMemo(
    () => organizations.filter((organization) => !organization.is_internal && organization.name.trim().toLowerCase() !== "xapcon group").sort((a, b) => a.name.localeCompare(b.name)),
    [organizations],
  );
  const selectedCompany = companies.find((company) => company.id === activeOrganizationId) || null;
  const displayedCompanies = activeOrganizationId ? (selectedCompany ? [selectedCompany] : []) : companies;
  const today = new Date();
  const week = weekRangeFromValue(selectedWeek);
  const reportDate = formatDate(today.getTime());
  const reportWeek = weekLabel(week);

  const reports = useMemo(() => displayedCompanies.map((company) => ({
    company,
    claims: claims
      .filter((claim) => claim.organizationId === company.id && isIncludedInReport(claim))
      .slice()
      .sort((a, b) => latestCaseManagementDateKey(b).localeCompare(latestCaseManagementDateKey(a))),
  })), [claims, displayedCompanies]);
  const totalCases = reports.reduce((sum, report) => sum + report.claims.length, 0);
  const weeklyManagementTotal = reports.reduce((sum, report) => sum + report.claims.reduce((caseSum, claim) => caseSum + countWeeklyManagement(claim, week), 0), 0);

  const downloadCsv = () => {
    const rows = [["Empresa contratista", "Número de Claim", "Campo", "Información"]];
    for (const { company, claims: companyClaims } of reports) {
      for (const claim of companyClaims) {
        const fields = [
          ["Nombre del Homeowner", claim.name || "Sin nombre registrado"],
          ["Aseguranza", claim.insuranceProvider || "Sin aseguradora registrada"],
          ["Número de Claim", claim.claimNumber || "Sin número registrado"],
          [`Gestión semanal (${reportWeek})`, `${countWeeklyManagement(claim, week)} actividades`],
          ["Última respuesta del seguro", lastInsuranceResponseText(claim)],
          ["Última llamada al seguro", activityText(newestRecord(claim.adminClaimRecords || [], "insurance_call"))],
          ["Última actualización al Homeowner", homeownerText(newestHomeownerContact(claim.adminHomeownerContacts || []))],
          ["Tareas pendientes", pendingTasksText(claim)],
        ];
        fields.forEach(([field, value]) => rows.push([
          companyLabel(company), claim.claimNumber || "Sin número", field, value,
        ]));
      }
    }
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `informe-casos-${selectedCompany ? selectedCompany.name : "todas-las-empresas"}-${week.start}-${week.end}.csv`.replace(/[^\p{L}\p{N}._-]+/gu, "-");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPdf = async () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const caseItems = reports.flatMap(({ company, claims: companyClaims }) => companyClaims.map((claim, index) => ({ company, claim, caseNumber: index + 1 })));
    const fileName = makePdfFileName(selectedCompany ? selectedCompany.name : "todas-las-empresas", week);
    pdf.setProperties({ title: `Informe de casos ${reportWeek}`, subject: "Seguimiento semanal de casos por empresa contratista", author: "Xapcon Group" });

    let pageNumber = 0;
    let casesOnPage = 0;
    let y = margin;
    const startPage = async () => {
      if (pageNumber > 0) pdf.addPage();
      pageNumber += 1;
      casesOnPage = 0;
      y = margin;
      if (pageNumber === 1) {
        try {
          const logoData = await imageUrlToPngData(logoXapcon);
          pdf.addImage(logoData, "PNG", margin, y, 22, 22);
        } catch (error) {
          console.error("No se pudo incorporar el logo al informe PDF:", error);
        }
        const textX = margin + 27;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(23, 59, 96);
        pdf.text("INFORME DE CASOS · XAPCON GROUP", textX, y + 5);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(66, 86, 107);
        pdf.text(`Semana: ${reportWeek}`, textX, y + 10);
        pdf.text("gestion@xapcongroup.com · xapcongroup.com", textX, y + 15);
        pdf.text("crm.xapcongroup.com · Tel. (601) 881-3663", textX, y + 20);
        y += 27;
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(23, 59, 96);
        pdf.text(`Informe semanal de casos · ${reportWeek}`, margin, y + 4);
        y += 9;
      }
      pdf.setDrawColor(23, 59, 96);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const drawCase = (item: typeof caseItems[number]) => {
      const { claim, company, caseNumber } = item;
      const weeklyCount = countWeeklyManagement(claim, week);
      const fields: [string, string][] = [
        ["Nombre del Homeowner", claim.name || "Sin nombre registrado"],
        ["Aseguranza", claim.insuranceProvider || "Sin aseguradora registrada"],
        ["Número de Claim", claim.claimNumber || "Sin número registrado"],
        [`Gestión semanal · ${reportWeek}`, `${weeklyCount} ${weeklyCount === 1 ? "actividad registrada" : "actividades registradas"}`],
        ["Última respuesta del seguro", lastInsuranceResponseText(claim)],
        ["Última llamada al seguro", activityText(newestRecord(claim.adminClaimRecords || [], "insurance_call"))],
        ["Última actualización al Homeowner", homeownerText(newestHomeownerContact(claim.adminHomeownerContacts || []))],
        ["Tareas pendientes", pendingTasksText(claim)],
      ];
      const labelWidth = 48;
      const valueX = margin + labelWidth + 5;
      const valueWidth = contentWidth - labelWidth - 9;
      const rows = fields.map(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        const labelLines = pdf.splitTextToSize(label, labelWidth);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.2);
        const valueLines = pdf.splitTextToSize(value || "Sin registro", valueWidth);
        const lineCount = Math.max(labelLines.length, valueLines.length);
        return { labelLines, valueLines, height: Math.max(6.2, lineCount * 3.6 + 2) };
      });
      const headerHeight = 9;
      const cardHeight = headerHeight + rows.reduce((height, row) => height + row.height, 0) + 2;
      pdf.setDrawColor(210, 219, 228);
      pdf.setLineWidth(0.3);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, "FD");
      pdf.setFillColor(237, 242, 247);
      pdf.roundedRect(margin, y, contentWidth, headerHeight, 2, 2, "F");
      pdf.rect(margin, y + headerHeight - 2, contentWidth, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(23, 59, 96);
      pdf.text(companyLabel(company), margin + 4, y + 5.8, { maxWidth: contentWidth - 36 });
      pdf.setFontSize(7.5);
      pdf.text(`CASO ${String(caseNumber).padStart(2, "0")}`, pageWidth - margin - 4, y + 5.8, { align: "right" });
      let rowY = y + headerHeight + 1;
      rows.forEach((row, index) => {
        if (index > 0) {
          pdf.setDrawColor(232, 237, 241);
          pdf.line(margin + 3, rowY, pageWidth - margin - 3, rowY);
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(93, 111, 128);
        pdf.text(row.labelLines, margin + 4, rowY + 4);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.2);
        pdf.setTextColor(36, 56, 75);
        pdf.text(row.valueLines, valueX, rowY + 4);
        rowY += row.height;
      });
      y += cardHeight + 4;
    };

    await startPage();
    if (!caseItems.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(66, 86, 107);
      pdf.text("No hay casos activos o en gestión en este informe.", margin, y + 5);
    } else {
      for (const item of caseItems) {
        if (casesOnPage === 2) await startPage();
        const estimatedHeight = 71;
        if (casesOnPage > 0 && y + estimatedHeight > pageHeight - margin) await startPage();
        drawCase(item);
        casesOnPage += 1;
      }
    }

    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      pdf.setPage(page);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(115, 130, 145);
      pdf.text(`${page} / ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    }
    pdf.save(fileName);
  };

  return (
    <div className="case-reports-screen min-h-full overflow-y-auto bg-[#F5F6F7] p-4 sm:p-7 lg:p-9">
      <style>{`
        @page { size: portrait; margin: 10mm; }
        @media print {
          body * { visibility: hidden !important; }
          .case-report-print, .case-report-print * { visibility: visible !important; }
          .case-report-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 0 !important; overflow: visible !important; background: white !important; color: #172b40 !important; }
          .case-reports-screen { min-height: 0 !important; height: auto !important; overflow: visible !important; padding: 0 !important; background: white !important; }
          .crm-main, .crm-content { display: block !important; height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .case-report-controls { display: none !important; }
          .case-report-branding { display: flex !important; }
          .case-report-company { break-inside: auto; margin-bottom: 5px !important; border-radius: 0 !important; box-shadow: none !important; }
          .case-report-company > header { gap: 8px !important; padding: 6px 10px !important; }
          .case-report-company > header h2 { margin-top: 1px !important; font-size: 12px !important; line-height: 1.2 !important; }
          .case-report-company > header p { margin-top: 1px !important; font-size: 7px !important; line-height: 1.25 !important; }
          .case-report-company > header > div:last-child { gap: 10px !important; }
          .case-report-company > header > div:last-child p { font-size: 7px !important; }
          .case-report-company > header > div:last-child p.text-2xl { font-size: 12px !important; }
          .case-report-cases { gap: 5px !important; padding: 5px !important; }
          .case-report-cases > * + * { margin-top: 0 !important; }
          .case-report-card { break-inside: avoid; page-break-inside: avoid; border-radius: 7px !important; box-shadow: none !important; }
          .case-report-card:nth-child(2n + 1):not(:first-child) { break-before: page; page-break-before: always; }
          .case-report-card-heading { padding: 5px 9px !important; }
          .case-report-fields { padding-left: 9px !important; padding-right: 9px !important; }
          .case-report-field { gap: 6px !important; padding-top: 3px !important; padding-bottom: 3px !important; }
          .case-report-icon { display: none !important; }
          .case-report-field > div { display: grid !important; grid-template-columns: 112px minmax(0, 1fr); align-items: baseline; column-gap: 8px; }
          .case-report-field-label { font-size: 8px !important; line-height: 1.15 !important; }
          .case-report-field-value { margin-top: 0 !important; font-size: 9px !important; line-height: 1.25 !important; }
          .case-report-field-detail { grid-column: 2; margin-top: 1px !important; font-size: 8px !important; line-height: 1.2 !important; }
        }
      `}</style>

      <div className="case-report-print mx-auto max-w-[920px]">
        <header className="case-report-branding mb-4 hidden items-center gap-3 border-b-2 border-[#173B60] pb-3">
        <img src={logoXapcon} alt="Xapcon Group" className="h-[50px] w-[50px] shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#687B8D]">Informe de casos · Xapcon Group</p>
            <p className="mt-1 text-[9px] leading-4 text-[#42566B]">gestion@xapcongroup.com · xapcongroup.com · crm.xapcongroup.com</p>
            <p className="text-[9px] leading-4 text-[#42566B]">Tel. (601) 881-3663</p>
          </div>
        </header>
        <header className="case-report-controls mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#53677B]"><Activity className="h-4 w-4 text-[#102A46]" /> Informes para contratistas</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#102A46] sm:text-3xl">Casos por empresa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53677B]">Cada expediente aparece en formato vertical con sus gestiones más recientes. Los casos finalizados, cancelados y negados quedan excluidos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-medium text-[#607286]">{activeOrganizationId ? (selectedCompany ? `Empresa seleccionada: ${selectedCompany.name}` : "La selección actual no es una empresa contratista") : "Empresa seleccionada: todas"}</span>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-[#D4DAE0] bg-white px-3 text-xs font-semibold text-[#53677B]">Semana <input aria-label="Semana del informe" type="week" value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)} className="w-[132px] bg-transparent text-sm font-semibold text-[#102A46] outline-none" /></label>
            <button type="button" onClick={downloadCsv} disabled={!displayedCompanies.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D4DAE0] bg-white px-3 text-sm font-semibold text-[#102A46] transition hover:bg-[#EDF0F4] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> Descargar CSV</button>
            <button type="button" onClick={() => void downloadPdf()} disabled={!displayedCompanies.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#102A46] px-3.5 text-sm font-semibold text-white transition hover:bg-[#193856] disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> Descargar PDF</button>
            <button type="button" onClick={() => window.print()} disabled={!displayedCompanies.length} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D4DAE0] bg-white px-3 text-sm font-semibold text-[#102A46] transition hover:bg-[#EDF0F4] disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" /> Vista de impresión</button>
          </div>
        </header>

        <div className="case-report-controls mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Empresas en este informe" value={displayedCompanies.length} />
          <SummaryCard label="Casos incluidos" value={totalCases} />
          <SummaryCard label="Gestiones esta semana" value={weeklyManagementTotal} detail={reportWeek} />
        </div>

        {!displayedCompanies.length ? <div className="rounded-xl border border-dashed border-[#C7D1DA] bg-white p-10 text-center text-sm text-[#53677B]">Selecciona una empresa contratista o “Todas las empresas” en el filtro superior.</div> : reports.map(({ company, claims: companyClaims }) => (
          <section key={company.id} className="case-report-company mb-6 overflow-hidden rounded-2xl border border-[#DDE2E7] bg-white shadow-sm">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DDE2E7] bg-[#EDF0F4] px-5 py-5 sm:px-7">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#53677B]">Informe de expedientes · {reportDate}</p><h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#102A46]"><Building2 className="h-5 w-5" /> {companyLabel(company)}</h2><p className="mt-1 text-xs text-[#53677B]">Semana de gestión: lunes a domingo · {reportWeek}</p></div>
              <div className="flex gap-5 text-right"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#607286]">Casos activos</p><p className="text-2xl font-bold tabular-nums text-[#102A46]">{companyClaims.length}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#607286]">Gestiones esta semana</p><p className="text-2xl font-bold tabular-nums text-[#102A46]">{companyClaims.reduce((sum, claim) => sum + countWeeklyManagement(claim, week), 0)}</p></div></div>
            </header>
            {companyClaims.length ? <div className="case-report-cases flex flex-col space-y-3 p-4 sm:p-6">
              {companyClaims.map((claim, index) => {
                const records = claim.adminClaimRecords || [];
                const weeklyCount = countWeeklyManagement(claim, week);
                const lastCall = newestRecord(records, "insurance_call");
                const lastHomeownerUpdate = newestHomeownerContact(claim.adminHomeownerContacts || []);
                const pendingTasks = (claim.tasks || []).filter((task) => task.status === "pending");
                return <article key={claim.id} className="case-report-card overflow-hidden rounded-xl border border-[#DFE5E9] bg-white">
                  <div className="case-report-card-heading flex items-center justify-between gap-3 border-b border-[#E7EBEF] bg-[#FAFBFC] px-4 py-3 sm:px-5">
                    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#66798B]">Caso {String(index + 1).padStart(2, "0")}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF0F6] px-2.5 py-1 text-[10px] font-bold text-[#173B60]"><Activity className="h-3.5 w-3.5" /> {weeklyCount} {weeklyCount === 1 ? "gestión" : "gestiones"} esta semana</span>
                  </div>
                  <div className="case-report-fields divide-y divide-[#E9EDF0] px-4 sm:px-5">
                    <ReportField icon={House} label="Nombre del Homeowner" value={claim.name || "Sin nombre registrado"} prominent />
                    <ReportField icon={ShieldCheck} label="Aseguranza" value={claim.insuranceProvider || "Sin aseguradora registrada"} />
                    <ReportField icon={FileText} label="Número de Claim" value={claim.claimNumber || "Sin número registrado"} />
                    <ReportField icon={CalendarDays} label={`Gestión semanal · ${reportWeek}`} value={`${weeklyCount} ${weeklyCount === 1 ? "actividad registrada" : "actividades registradas"}`} detail="Cuenta llamadas y respuestas al seguro, y contactos al Homeowner, de lunes a domingo." />
                    <ReportField icon={MessageCircle} label="Última respuesta del seguro" value={lastInsuranceResponseText(claim)} />
                    <ReportField icon={PhoneCall} label="Última llamada al seguro" value={activityText(lastCall)} />
                    <ReportField icon={House} label="Última actualización al Homeowner" value={homeownerText(lastHomeownerUpdate)} />
                    <ReportField icon={ListTodo} label="Tareas pendientes" value={pendingTasks.length ? `${pendingTasks.length} ${pendingTasks.length === 1 ? "tarea pendiente" : "tareas pendientes"}` : "No tiene tareas pendientes"} detail={pendingTasks.length ? pendingTasks.map((task) => `${task.title} · ${task.dueDate ? formatDate(task.dueDate) : "Sin fecha límite"}`).join(" | ") : undefined} />
                  </div>
                </article>;
              })}
            </div> : <p className="px-6 py-12 text-center text-sm text-[#607286]">No hay casos activos o en gestión para esta empresa.</p>}
          </section>
        ))}
        <p className="case-report-controls text-center text-[10px] text-[#607286]">Informe generado desde Xapcon CRM · Información correspondiente a cada empresa contratista</p>
      </div>
    </div>
  );
}

function ReportField({ icon: Icon, label, value, detail, prominent = false }: { icon: typeof Activity; label: string; value: string; detail?: string; prominent?: boolean }) {
  return <div className="case-report-field flex gap-3 py-3.5">
    <span className="case-report-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF2F5] text-[#244B70]"><Icon className="h-4 w-4" /></span>
    <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(125px,0.5fr)_minmax(0,1.5fr)] sm:gap-x-3">
      <p className="case-report-field-label text-[10px] font-bold uppercase tracking-[.08em] text-[#687B8D]">{label}</p>
      <p className={`case-report-field-value mt-1 whitespace-pre-wrap break-words leading-5 text-[#24384B] ${prominent ? "text-sm font-bold" : "text-xs font-medium"}`}>{value}</p>
      {detail && <p className="case-report-field-detail mt-1 text-[10px] leading-4 text-[#748496]">{detail}</p>}
    </div>
  </div>;
}

function pendingTasksText(claim: Lead) {
  const pendingTasks = (claim.tasks || []).filter((task) => task.status === "pending");
  if (!pendingTasks.length) return "No tiene tareas pendientes";
  return pendingTasks.map((task) => `${task.title} · ${task.dueDate ? formatDate(task.dueDate) : "Sin fecha límite"}`).join(" | ");
}

function imageUrlToPngData(url: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("No se pudo preparar el logo para el PDF."));
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("No se pudo cargar el logo de Xapcon."));
    image.src = url;
  });
}

function makePdfFileName(companyName: string, week: { start: string; end: string }) {
  return `informe-casos-${companyName}-${week.start}-${week.end}.pdf`.replace(/[^\p{L}\p{N}._-]+/gu, "-");
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return <div className="rounded-xl border border-[#DDE2E7] bg-white px-4 py-3 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wide text-[#607286]">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#102A46]">{value}</p>{detail && <p className="mt-1 text-[10px] leading-4 text-[#718096]">{detail}</p>}</div>;
}
