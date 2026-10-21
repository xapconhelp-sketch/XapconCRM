import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import logo from "../LogoNegativo-copia.png";
import { ViewType, Lead, Estimate, TeamMember, TimelineEvent, TaskItem, DocumentItem, AdminClaimActivity, AdminClaimRecord, AdminHomeownerContact } from "./types";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { queryAll } from "./lib/queryAll.js";
import { publicEstimate } from "./lib/estimatePrivacy.js";
import { leadSummarySelect, preserveCaseDocuments } from "./lib/leadQueries.js";
import { caseFileService } from "./services/caseFileService";
import { backgroundRefresh } from "./lib/backgroundRefresh.js";

import Sidebar from "./components/Sidebar";
import ContractorNavigation from "./components/contractor/Navigation";
import { ContractorDesignContext } from "./components/contractor/DesignSystem";
const MainDashboard = lazy(() => import("./components/MainDashboard"));
const ContractorDashboard = lazy(() => import("./components/ContractorDashboard"));
const LeadsView = lazy(() => import("./components/LeadsView"));
const EstimatorView = lazy(() => import("./components/EstimatorView"));
const ProductionView = lazy(() => import("./components/ProductionView"));
const InsuranceDirectoryView = lazy(() => import("./components/InsuranceDirectoryView"));
const ValuesInsuranceView = lazy(() => import("./components/ValuesInsuranceView"));
const ContractorCaseReportsView = lazy(() => import("./components/ContractorCaseReportsView"));
const MembershipAccessView = lazy(() => import("./components/MembershipAccessView"));
import { fetchDbInsuranceCompanies, getAllInsuranceCompanyNames } from "./data/insuranceDirectoryData";
const TeamView = lazy(() => import("./components/TeamView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const LoginView = lazy(() => import("./components/LoginView"));
import { NotificationBell } from "./components/NotificationBell";
import { eligibleCaseMembers, memberBelongsToOrganization } from "./lib/teamAccess.js";
const PasswordRecoveryView = lazy(() => import("./components/PasswordRecoveryView"));
import ContractorWeather from "./components/ContractorWeather";

import { Menu, X, Search, ChevronRight, ChevronDown, Building2, Check } from "lucide-react";

type AppRole = "admin" | "contractor";

interface AppRoute {
  role: AppRole | null;
  organizationId: string | null;
  hasOrganizationSegment: boolean;
  view: ViewType | null;
}

function parseAppRoute(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean);
  const role = segments[0] === "admin" || segments[0] === "contractor" ? segments[0] : null;
  const routeSegments = role ? segments.slice(1) : [];
  const viewSegment = routeSegments.at(-1);
  const view = Object.values(ViewType).find((candidate) => candidate === viewSegment) || null;
  const hasOrganizationSegment = routeSegments.length >= 2;

  return {
    role,
    organizationId: hasOrganizationSegment ? routeSegments[0] : null,
    hasOrganizationSegment,
    view,
  };
}

function normalizeViewForRole(view: ViewType | null, role: AppRole): ViewType {
  if (!view) return ViewType.DASHBOARD;
  if (role === "contractor" && view === ViewType.VALORES_INSURANCE) return ViewType.DASHBOARD;
  if (role === "contractor" && view === ViewType.CONTRACTOR_CASE_REPORTS) return ViewType.DASHBOARD;
  if (role === "contractor" && view === ViewType.MEMBERSHIP_ACCESS) return ViewType.DASHBOARD;
  if (role === "admin" && view === ViewType.CLAIMS) return ViewType.DASHBOARD;
  return view;
}

function buildAppPath(view: ViewType, role: AppRole, organizationId?: string | null): string {
  const base = `/${role}`;
  return `${base}${organizationId ? `/${encodeURIComponent(organizationId)}` : ""}/${view}`;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl m-4 text-red-800">
          <h2 className="text-lg font-bold mb-2">Ha ocurrido un error en la interfaz</h2>
          <pre className="text-xs bg-red-100 p-4 rounded overflow-auto font-mono whitespace-pre-wrap">
            {/* @ts-ignore */}
            {this.state.error?.stack || this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

function LiveDateTime() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <span className="font-display text-[10px] text-slate-400 font-medium tracking-[0.04em] capitalize">
      {dateStr} &nbsp;·&nbsp; {timeStr}
    </span>
  );
}


export default function App() {
  const { session, profile, setProfile, activeOrganization, organizations, setOrganizations, setActiveOrganization, signOut, loading, accountError, retryAccount, passwordRecovery, finishPasswordRecovery } = useAuth();

  useEffect(() => {
    try {
      const density = localStorage.getItem(`xapcon_settings_density_${profile?.id || "guest"}`);
      document.documentElement.dataset.uiDensity = density === "compact" ? "compact" : "comfortable";
    } catch {
      document.documentElement.dataset.uiDensity = "comfortable";
    }
  }, [profile?.id]);


  // Mapear los roles de Supabase al estado de la vista
  // SOLO el super_admin (Xapcon Group) ve el panel de administración
  const userRole = profile?.role === 'super_admin' ? 'admin' : 'contractor';
  const canManageTeam = profile?.role === "super_admin" || activeOrganization?.membership_role === "owner";
  const dataContext = useRef('');
  const caseDocumentCache = useRef(new Map<string, DocumentItem[]>());
  const contractorCompany = activeOrganization?.name || "Desconocida";
  const selectedCompanyFilter = activeOrganization?.name || "Todas";

  // La vista vive en la URL: sobrevive a una recarga y permite usar Atrás/Adelante.
  const [currentView, setCurrentView] = useState<ViewType>(() =>
    parseAppRoute(window.location.pathname).view || ViewType.DASHBOARD
  );
  dataContext.current = `${session?.user.id || ""}:${activeOrganization?.id || ""}:${userRole}:${currentView}`;
  const navigateToView = (requestedView: ViewType, organizationId: string | null | undefined = activeOrganization?.id) => {
    const nextView = normalizeViewForRole(requestedView, userRole);
    const nextPath = buildAppPath(nextView, userRole, organizationId);
    if (window.location.pathname !== nextPath) window.history.pushState({ xapconApp: true }, "", nextPath);
    setCurrentView(nextView);
  };

  const handleSetCompanyFilter = (val: string) => {
    const org = val === "Todas" ? null : organizations.find(o => o.id === val) || null;
    setActiveOrganization(org);
    const nextPath = buildAppPath(currentView, userRole, org?.id);
    if (window.location.pathname !== nextPath) window.history.pushState({ xapconApp: true }, "", nextPath);
  };

  // Rehidratar la organización indicada en la URL y corregir rutas que no
  // correspondan al rol autenticado, sin reiniciar la sección actual.
  useEffect(() => {
    if (!session || !profile || loading) return;
    const route = parseAppRoute(window.location.pathname);
    const routeView = normalizeViewForRole(route.view, userRole);

    if (route.role && route.role !== userRole) {
      const path = buildAppPath(ViewType.DASHBOARD, userRole, activeOrganization?.id);
      window.history.replaceState({ xapconApp: true }, "", path);
      setCurrentView(ViewType.DASHBOARD);
      return;
    }

    if (route.role === userRole && route.hasOrganizationSegment && route.organizationId) {
      const routeOrganization = organizations.find((organization) => organization.id === route.organizationId) || null;
      if (routeOrganization && routeOrganization.id !== activeOrganization?.id) setActiveOrganization(routeOrganization);
    } else if (route.role === userRole && !route.hasOrganizationSegment && userRole === "admin" && activeOrganization) {
      setActiveOrganization(null);
    }

    if (route.view && routeView !== currentView) setCurrentView(routeView);
    const orgId = route.hasOrganizationSegment
      ? organizations.find((organization) => organization.id === route.organizationId)?.id || activeOrganization?.id
      : activeOrganization?.id;
    const normalizedPath = buildAppPath(routeView, userRole, orgId);
    if (window.location.pathname !== normalizedPath) window.history.replaceState({ xapconApp: true }, "", normalizedPath);
  }, [session?.user.id, profile?.id, loading, organizations, activeOrganization, userRole, currentView, setActiveOrganization]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseAppRoute(window.location.pathname);
      if (route.role && route.role !== userRole) {
        window.history.replaceState({ xapconApp: true }, "", buildAppPath(ViewType.DASHBOARD, userRole, activeOrganization?.id));
        setCurrentView(ViewType.DASHBOARD);
        return;
      }

      const nextView = normalizeViewForRole(route.view, userRole);
      setCurrentView(nextView);
      if (route.role === userRole && route.hasOrganizationSegment) {
        const organization = organizations.find((item) => item.id === route.organizationId) || null;
        if (organization) setActiveOrganization(organization);
      } else if (route.role === userRole && userRole === "admin") {
        setActiveOrganization(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [userRole, organizations, activeOrganization?.id, setActiveOrganization]);

  // Views and collapsible menus
  const [openClaimFormOnEnter, setOpenClaimFormOnEnter] = useState(false);
  const [companyFilterOpen, setCompanyFilterOpen] = useState(false);
  const companyFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (userRole === "contractor" && currentView === ViewType.VALORES_INSURANCE) {
      navigateToView(ViewType.DASHBOARD);
    } else if (userRole === "admin" && currentView === ViewType.CLAIMS) {
      navigateToView(ViewType.DASHBOARD);
    }
  }, [currentView, userRole]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!companyFilterOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !companyFilterRef.current?.contains(event.target)) {
        setCompanyFilterOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompanyFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [companyFilterOpen]);

  // Core CRM States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [insuranceClaims, setInsuranceClaims] = useState<Lead[]>([]);
  const [selectedInsuranceClaimId, setSelectedInsuranceClaimId] = useState<string>(() => {
    try { return localStorage.getItem("crm_selected_claim_id") || ""; } catch { return ""; }
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [insuranceRefreshKey, setInsuranceRefreshKey] = useState(0);

  // Keep the shared insurer catalog in sync for both admin and contractor sessions.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const directoryRefresh = backgroundRefresh(async () => {
      await fetchDbInsuranceCompanies();
      if (cancelled) return;
      setInsuranceRefreshKey(k => k + 1);
    });
    const refreshDirectory = directoryRefresh.refresh;
    void refreshDirectory();
    const interval = window.setInterval(() => void refreshDirectory(), 30000);
    window.addEventListener("focus", refreshDirectory);
    document.addEventListener("visibilitychange", refreshDirectory);
    return () => {
      cancelled = true;
      directoryRefresh.stop();
      document.removeEventListener("visibilitychange", refreshDirectory);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshDirectory);
    };
  }, [session?.user.id]);

  const availableInsuranceCompanies = useMemo(() => {
    return getAllInsuranceCompanyNames([...leads, ...insuranceClaims]);
  }, [leads, insuranceClaims, insuranceRefreshKey]);

  useEffect(() => {
    try { localStorage.setItem("crm_selected_claim_id", selectedInsuranceClaimId); } catch { /* Storage can be unavailable. */ }
  }, [selectedInsuranceClaimId]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [estimatePrivacyError, setEstimatePrivacyError] = useState("");
  const [leadDataContext, setLeadDataContext] = useState("");
  const [leadLoadError, setLeadLoadError] = useState("");

  useEffect(() => {
    if (!session?.user.id) return;
    const cleanup = backgroundRefresh(() => caseFileService.flushCleanup());
    void cleanup.refresh();
    const timer = setInterval(() => void cleanup.refresh(), 60_000);
    document.addEventListener("visibilitychange", cleanup.refresh);
    return () => { cleanup.stop(); clearInterval(timer); document.removeEventListener("visibilitychange", cleanup.refresh); };
  }, [session?.user.id]);
  useEffect(() => {
    setLeads([]); setInsuranceClaims([]); setTeamMembers([]); caseDocumentCache.current.clear();
  }, [session?.user.id, activeOrganization?.id, userRole]);

  // Carga asíncrona de datos desde Supabase
  const fetchLeads = async () => {
    if (!session || !profile) return;
    const context = dataContext.current;

    let query = supabase
      .from('leads')
      .select(leadSummarySelect(currentView === ViewType.CLAIMS))
      .order('created_at', { ascending: false }).order('id');

    if (userRole === 'contractor') {
      if (activeOrganization) {
        query = query.eq('organization_id', activeOrganization.id);
      } else {
        setLeads([]);
        setInsuranceClaims([]);
        return;
      }
    } else {
      if (selectedCompanyFilter !== 'Todas') {
        const selectedOrg = activeOrganization;
        if (selectedOrg) {
          query = query.eq('organization_id', selectedOrg.id);
        }
      }
    }

    const { data, error } = await queryAll((from, to) => query.range(from, to));
    if (context !== dataContext.current) return;
    if (error) {
      console.error("Error al obtener leads:", error.message);
      setLeadLoadError("No se pudieron cargar los casos. Revisa la conexión y vuelve a intentarlo.");
      return;
    }

    if (data) {
      const privateEstimates = new Map<string, Record<string, unknown>>();
      if (userRole === "admin") {
        const result = await queryAll((from, to) => {
          let privateQuery = supabase.from("admin_estimate_private").select("lead_id,private_fields,leads!inner(organization_id)").order("lead_id");
          if (activeOrganization) privateQuery = privateQuery.eq("leads.organization_id", activeOrganization.id);
          return privateQuery.range(from, to);
        });
        if (context !== dataContext.current) return;
        setEstimatePrivacyError(result.error ? "No se pudo cargar la información privada de estimaciones. Verifica la migración schema_crm_audit_fixes.sql y los permisos de Supabase." : "");
        for (const row of result.data || []) privateEstimates.set(row.lead_id, row.private_fields);
      } else setEstimatePrivacyError("");
      const adminActivityByLead = new Map<string, AdminClaimActivity>();
      const adminClaimRecordsByLead = new Map<string, AdminClaimRecord[]>();
      const adminHomeownerContactsByLead = new Map<string, AdminHomeownerContact[]>();
      if (userRole === "admin" && data.some((item: any) => item.is_insurance_claim)) {
        const scopeAdminQuery = (query: any) => activeOrganization ? query.eq("organization_id", activeOrganization.id) : query;
        const [activityResult, claimRecordResult, contactResult] = await Promise.all([
          queryAll((from, to) => scopeAdminQuery(supabase.from("admin_claim_activity")
            .select("lead_id, last_insurance_response_at, last_documents_sent_at, sent_document_types")
            ).order("lead_id").range(from, to)),
          queryAll((from, to) => scopeAdminQuery(supabase.from("admin_claim_records")
            .select("id, lead_id, record_type, recorded_at, note, document_types, created_at")
            ).order("recorded_at", { ascending: false })
            .order("created_at", { ascending: false }).order("id").range(from, to)),
          queryAll((from, to) => scopeAdminQuery(supabase.from("admin_homeowner_contacts")
            .select("id, lead_id, contacted_at, channels, note, created_at")
            ).order("contacted_at", { ascending: false })
            .order("created_at", { ascending: false }).order("id").range(from, to)),
        ]);
        const { data: activityRows, error: activityError } = activityResult;
        if (activityError) {
          console.error("Error al obtener el seguimiento interno de casos:", activityError.message);
        } else {
          (activityRows || []).forEach((row: any) => adminActivityByLead.set(row.lead_id, {
            lastInsuranceResponseAt: row.last_insurance_response_at || "",
            lastDocumentsSentAt: row.last_documents_sent_at || "",
            sentDocumentTypes: Array.isArray(row.sent_document_types) ? row.sent_document_types : [],
          }));
        }

        const { data: claimRecordRows, error: claimRecordError } = claimRecordResult;
        if (claimRecordError) {
          console.error("Error al obtener el historial de registros del caso:", claimRecordError.message);
        } else {
          (claimRecordRows || []).forEach((row: any) => {
            const records = adminClaimRecordsByLead.get(row.lead_id) || [];
            records.push({
              id: row.id,
              type: row.record_type,
              date: row.recorded_at || "",
              note: row.note || "",
              documentTypes: Array.isArray(row.document_types) ? row.document_types : [],
              createdAt: row.created_at || "",
            });
            adminClaimRecordsByLead.set(row.lead_id, records);
          });
        }

        const { data: contactRows, error: contactError } = contactResult;
        if (contactError) {
          console.error("Error al obtener el historial de servicio al homeowner:", contactError.message);
        } else {
          (contactRows || []).forEach((row: any) => {
            const contacts = adminHomeownerContactsByLead.get(row.lead_id) || [];
            contacts.push({
              id: row.id,
              contactedAt: row.contacted_at || "",
              channels: Array.isArray(row.channels) ? row.channels : [],
              note: row.note || "",
              createdAt: row.created_at || "",
            });
            adminHomeownerContactsByLead.set(row.lead_id, contacts);
          });
        }
      }

      const mappedLeads: Lead[] = data.map((item: any) => {
        const caseTasks = item.tasks || [];

        return {
          id: item.id,
          name: item.name,
          status: item.status,
          address: item.address || "",
          phone: item.phone || "",
          phone2: item.phone2 || "",
          email: item.email || "",
          email2: item.email2 || "",
          propertyType: item.property_type || "Residential - Single Family",
          sqft: item.sqft ?? 0,
          insuranceProvider: item.insurance_provider || "No registrada",
          claimNumber: item.claim_number || "Por reclamar",
          policyNumber: item.policy_number || "",
          damageType: item.damage_type || "",
          lossDate: item.loss_date || "",
          insurancePhone1: item.insurance_phone1 || "",
          insurancePhone2: item.insurance_phone2 || "",
          insuranceEmail1: item.insurance_email1 || "",
          insuranceEmail2: item.insurance_email2 || "",
          notes: item.notes || "",
          insuranceNotes: item.insurance_notes || "",
          adjusterName: item.adjuster_name || "Por asignar",
          assignedRep: item.assigned_rep || "Por asignar",
          assignedRepAvatar: item.assigned_rep_avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC",
          createdAt: new Date(item.created_at).toLocaleDateString(),
          created_at: item.created_at,
          timeline: item.timeline || [],
          documents: item.documents || [],
          tasks: caseTasks,
          company: item.organizations?.name || "Desconocida",
          organizationId: item.organization_id,
          is_insurance_claim: item.is_insurance_claim,
          estimate: item.estimate ? { ...publicEstimate(item.estimate), ...(userRole === "admin" ? (privateEstimates.get(item.id) || { profitMargin: item.estimate.profitMargin }) : {}) } as Estimate : null,
          ...(userRole === "admin" && item.is_insurance_claim ? {
            adminActivity: adminActivityByLead.get(item.id),
            adminClaimRecords: adminClaimRecordsByLead.get(item.id) || [],
            adminHomeownerContacts: adminHomeownerContactsByLead.get(item.id) || [],
          } : {})
        };
      });

      const normalLeads = mappedLeads.filter(l => !l.is_insurance_claim);
      const claims = mappedLeads.filter(l => l.is_insurance_claim);

      if (context !== dataContext.current) return;
      setLeadLoadError("");
      setLeadDataContext(context);
      setLeads(prev => preserveCaseDocuments(prev, normalLeads, caseDocumentCache.current));
      setInsuranceClaims(prev => preserveCaseDocuments(prev, claims, caseDocumentCache.current));
    }
  };

  const handleSaveAdminClaimRecord = async (
    leadId: string,
    record: Omit<AdminClaimRecord, "id" | "createdAt">
  ): Promise<boolean> => {
    if (!session || userRole !== "admin") return false;
    const targetClaim = insuranceClaims.find(claim => claim.id === leadId && claim.is_insurance_claim);
    if (!targetClaim?.organizationId) return false;

    const { data, error } = await supabase.from("admin_claim_records").insert({
      lead_id: leadId,
      organization_id: targetClaim.organizationId,
      record_type: record.type,
      recorded_at: record.date,
      note: record.note,
      document_types: record.documentTypes,
      created_by: session.user.id,
    }).select("id, record_type, recorded_at, note, document_types, created_at").single();

    if (error || !data) {
      console.error("Error al guardar el registro del caso:", error?.message);
      alert("No se pudo guardar el registro. Si seleccionaste Carta, ITEL o Fabricante, actualiza en Supabase la lista permitida con schema_admin_claim_document_types.sql y vuelve a guardar. " + (error?.message || ""));
      return false;
    }

    const savedRecord: AdminClaimRecord = {
      id: data.id,
      type: data.record_type,
      date: data.recorded_at || record.date,
      note: data.note || "",
      documentTypes: Array.isArray(data.document_types) ? data.document_types : [],
      createdAt: data.created_at || new Date().toISOString(),
    };
    const currentActivity = targetClaim.adminActivity || {
      lastInsuranceResponseAt: "",
      lastDocumentsSentAt: "",
      sentDocumentTypes: [],
    };
    const isCurrentOrNewer = (date: string, existingDate: string) => !existingDate || date >= existingDate;
    const updatedActivity: AdminClaimActivity = record.type === "documents_sent"
      ? (isCurrentOrNewer(record.date, currentActivity.lastDocumentsSentAt)
        ? { ...currentActivity, lastDocumentsSentAt: record.date, sentDocumentTypes: record.documentTypes }
        : currentActivity)
      : record.type === "insurance_response"
        ? (isCurrentOrNewer(record.date, currentActivity.lastInsuranceResponseAt)
        ? { ...currentActivity, lastInsuranceResponseAt: record.date }
        : currentActivity)
        : currentActivity;

    if (record.type !== "insurance_call") {
      const { error: activityError } = await supabase.from("admin_claim_activity").upsert({
        lead_id: leadId,
        organization_id: targetClaim.organizationId,
        last_insurance_response_at: updatedActivity.lastInsuranceResponseAt || null,
        last_documents_sent_at: updatedActivity.lastDocumentsSentAt || null,
        sent_document_types: updatedActivity.sentDocumentTypes,
      }, { onConflict: "lead_id" });
      if (activityError) {
        console.error("Error al actualizar el resumen de actividad del caso:", activityError.message);
        alert("El registro se guardó, pero no se pudo actualizar la fecha de seguimiento para las alertas. " + activityError.message);
      }
    }

    const updatedLead = {
      ...targetClaim,
      adminActivity: updatedActivity,
      adminClaimRecords: [savedRecord, ...(targetClaim.adminClaimRecords || [])]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    };
    setInsuranceClaims(prev => prev.map(claim => claim.id === leadId ? updatedLead : claim));
    setLeads(prev => prev.map(lead => lead.id === leadId ? updatedLead : lead));
    return true;
  };

  const handleDeleteAdminClaimRecord = async (leadId: string, recordId: string): Promise<boolean> => {
    if (!session || userRole !== "admin") return false;
    const targetClaim = insuranceClaims.find(claim => claim.id === leadId && claim.is_insurance_claim);
    if (!targetClaim?.organizationId) return false;

    const { data: deletedRecord, error: deleteError } = await supabase
      .from("admin_claim_records")
      .delete()
      .eq("id", recordId)
      .eq("lead_id", leadId)
      .select("id")
      .maybeSingle();
    if (deleteError || !deletedRecord) {
      console.error("Error al eliminar el registro del caso:", deleteError?.message || "No se encontró el registro.");
      alert("No se pudo eliminar el registro. Verifica tus permisos y vuelve a intentarlo. " + (deleteError?.message || ""));
      return false;
    }

    const { data: remainingRows, error: listError } = await supabase
      .from("admin_claim_records")
      .select("id, record_type, recorded_at, note, document_types, created_at")
      .eq("lead_id", leadId)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (listError) {
      console.error("No se pudo recalcular el resumen de registros:", listError.message);
      alert("El registro se eliminó, pero no se pudo recalcular el resumen. Recarga el expediente para actualizarlo. " + listError.message);
      setInsuranceClaims(prev => prev.map(claim => claim.id === leadId
        ? { ...claim, adminClaimRecords: (claim.adminClaimRecords || []).filter(record => record.id !== recordId) }
        : claim));
      setLeads(prev => prev.map(lead => lead.id === leadId
        ? { ...lead, adminClaimRecords: (lead.adminClaimRecords || []).filter(record => record.id !== recordId) }
        : lead));
      return true;
    }

    const remainingRecords: AdminClaimRecord[] = (remainingRows || []).map((row: any) => ({
      id: row.id,
      type: row.record_type,
      date: row.recorded_at || "",
      note: row.note || "",
      documentTypes: Array.isArray(row.document_types) ? row.document_types : [],
      createdAt: row.created_at || "",
    }));
    const latestRecordOfType = (type: AdminClaimRecord["type"]) => remainingRecords.find(record => record.type === type);
    const latestResponse = latestRecordOfType("insurance_response");
    const latestDocuments = latestRecordOfType("documents_sent");
    const updatedActivity: AdminClaimActivity = {
      lastInsuranceResponseAt: latestResponse?.date || "",
      lastDocumentsSentAt: latestDocuments?.date || "",
      sentDocumentTypes: latestDocuments?.documentTypes || [],
    };

    const { error: activityError } = await supabase.from("admin_claim_activity").upsert({
      lead_id: leadId,
      organization_id: targetClaim.organizationId,
      last_insurance_response_at: updatedActivity.lastInsuranceResponseAt || null,
      last_documents_sent_at: updatedActivity.lastDocumentsSentAt || null,
      sent_document_types: updatedActivity.sentDocumentTypes,
    }, { onConflict: "lead_id" });
    if (activityError) {
      console.error("Error al actualizar el resumen después de eliminar un registro:", activityError.message);
      alert("El registro se eliminó, pero no se pudo actualizar el resumen del caso. Recarga el expediente. " + activityError.message);
    }

    const updatedLead = { ...targetClaim, adminActivity: updatedActivity, adminClaimRecords: remainingRecords };
    setInsuranceClaims(prev => prev.map(claim => claim.id === leadId ? updatedLead : claim));
    setLeads(prev => prev.map(lead => lead.id === leadId ? updatedLead : lead));
    return true;
  };

  const handleAddAdminHomeownerContact = async (
    leadId: string,
    contact: Omit<AdminHomeownerContact, "id" | "createdAt">
  ): Promise<boolean> => {
    if (!session || userRole !== "admin") return false;
    const targetClaim = insuranceClaims.find(claim => claim.id === leadId && claim.is_insurance_claim);
    if (!targetClaim?.organizationId) return false;

    const { data, error } = await supabase.from("admin_homeowner_contacts").insert({
      lead_id: leadId,
      organization_id: targetClaim.organizationId,
      contacted_at: contact.contactedAt,
      channels: contact.channels,
      note: contact.note,
      created_by: session.user.id,
    }).select("id, contacted_at, channels, note, created_at").single();

    if (error || !data) {
      console.error("Error al guardar el contacto con homeowner:", error?.message);
      alert("No se pudo guardar el contacto con el homeowner. Verifica que schema_admin_homeowner_contacts.sql esté aplicado en Supabase. " + (error?.message || ""));
      return false;
    }

    const savedContact: AdminHomeownerContact = {
      id: data.id,
      contactedAt: data.contacted_at || contact.contactedAt,
      channels: Array.isArray(data.channels) ? data.channels : contact.channels,
      note: data.note || "",
      createdAt: data.created_at || new Date().toISOString(),
    };
    setInsuranceClaims(prev => prev.map(claim => claim.id === leadId
      ? { ...claim, adminHomeownerContacts: [savedContact, ...(claim.adminHomeownerContacts || [])] }
      : claim));
    setLeads(prev => prev.map(lead => lead.id === leadId
      ? { ...lead, adminHomeownerContacts: [savedContact, ...(lead.adminHomeownerContacts || [])] }
      : lead));
    return true;
  };

  const handleDeleteAdminHomeownerContact = async (leadId: string, contactId: string): Promise<boolean> => {
    if (!session || userRole !== "admin") return false;
    const { data: deletedContact, error } = await supabase
      .from("admin_homeowner_contacts")
      .delete()
      .eq("id", contactId)
      .eq("lead_id", leadId)
      .select("id")
      .maybeSingle();
    if (error || !deletedContact) {
      console.error("Error al eliminar el contacto con homeowner:", error?.message || "No se encontró el registro.");
      alert("No se pudo eliminar el contacto. Verifica tus permisos y vuelve a intentarlo. " + (error?.message || ""));
      return false;
    }
    setInsuranceClaims(prev => prev.map(claim => claim.id === leadId
      ? { ...claim, adminHomeownerContacts: (claim.adminHomeownerContacts || []).filter(contact => contact.id !== contactId) }
      : claim));
    setLeads(prev => prev.map(lead => lead.id === leadId
      ? { ...lead, adminHomeownerContacts: (lead.adminHomeownerContacts || []).filter(contact => contact.id !== contactId) }
      : lead));
    return true;
  };

  const fetchTeamMembers = async () => {
    if (!session || !profile) return;
    const context = dataContext.current;

    // Fetch all profiles from Supabase, including their organization details
    const { data, error } = await queryAll((from, to) => supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        organization_id,
        job_title,
        avatar_url,
        phone,
        address,
        created_at,
        company_email,
        company_website,
        registration_number,
        license_number,
        user_organizations (
          organization_id,
          organizations (
            id,
            name,
            invite_code
          )
        )
      `).order("id").range(from, to));

    if (error) {
      console.error("Error al obtener perfiles de equipo:", error.message);
      return;
    }

    if (data) {
      try {
        const mappedMembers: TeamMember[] = data.map((item: any) => {
          const memberships = item.user_organizations || [];
          const orgData = memberships.find((m: any) => m.organization_id === activeOrganization?.id)?.organizations || memberships.find((m: any) => m.organization_id === item.organization_id)?.organizations || memberships[0]?.organizations;
          const organizationIds = memberships.map((m: any) => m.organization_id);
          const orgName = orgData?.name || "Xapcon Group";
          const inviteCode = orgData?.invite_code || "";

        // Map roles to readable client terms
        let roleText = item.role || "Colaborador";
        let roleCat: TeamMember["roleCategory"] = "pm";

        if (item.role === 'super_admin') {
          roleText = "Superadministrador de Xapcon Group";
          roleCat = "admin";
        } else if (item.role === 'platform_staff') {
          roleText = `${item.job_title || 'Colaborador'} de Xapcon Group`;
          roleCat = 'staff';
        } else if (item.role === 'owner' || item.role === 'Dueño') {
          roleText = `Dueño de ${orgName}`;
          roleCat = "contractor";
        } else if (item.role === 'contractor' || item.role === 'Contratista') {
          roleText = `Contratista de ${orgName}`;
          roleCat = "contractor";
        } else if (item.role === 'Vendedor' || item.role === 'Gerente de Ventas') {
          roleCat = "sales";
        } else if (item.role === 'employee' || item.role === 'Colaborador') {
          const jobTitle = item.job_title || "Colaborador";
          roleText = `${jobTitle} de ${orgName}`;
          const normalizedTitle = jobTitle.toLowerCase();
          roleCat = normalizedTitle.includes('venta') || normalizedTitle.includes('sales') || normalizedTitle.includes('vendedor') || normalizedTitle.includes('asesor') || normalizedTitle.includes('comercial')
            ? "sales"
            : normalizedTitle.includes('crew') || normalizedTitle.includes('instal') || normalizedTitle.includes('cuadrilla') || normalizedTitle.includes('equipo')
              ? "install"
              : "pm";
        }

          return {
            id: item.id,
            name: item.full_name || (item.email ? item.email.split('@')[0] : 'Usuario'),
            role: roleText,
            roleCategory: roleCat,
            avatar: item.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC",
            status: "Available",
          company: orgName,
          companyInviteCode: inviteCode,
          organizationId: orgData?.id || "",
          organizationIds,
          email: item.email,
          phone: item.phone || "",
          address: item.address || "",
          companyEmail: item.company_email || "",
          companyWebsite: item.company_website || "",
          registrationNumber: item.registration_number || "",
          licenseNumber: item.license_number || "",

        };
      });

        if (context !== dataContext.current) return;
        // Contractor role sees only members of their own company/org PLUS admins
        if (userRole === "contractor") {
          const filtered = mappedMembers.filter(m =>
            memberBelongsToOrganization(m, activeOrganization?.id) ||
            m.roleCategory === "admin" ||
            m.role === "Dueño de Xapcon Group" ||
            m.role === "super_admin"
          );
          setTeamMembers(filtered);
        } else {
          setTeamMembers(mappedMembers);
        }
      } catch (err: any) {
        console.error("Mapping error:", err);
      }
    }
  };

  useEffect(() => {
    if (!session || !profile || accountError) return;
    const leadRefresh = backgroundRefresh(fetchLeads);
    const teamRefresh = backgroundRefresh(fetchTeamMembers);
    const refresh = () => { void leadRefresh.refresh(); void teamRefresh.refresh(); };
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const channel = supabase.channel(`company-members-${session.user.id}-${activeOrganization?.id || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void teamRefresh.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_organizations' }, () => void teamRefresh.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => void leadRefresh.refresh()).subscribe();
    return () => { leadRefresh.stop(); teamRefresh.stop(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); void supabase.removeChannel(channel); };
  }, [session?.user.id, profile?.id, activeOrganization?.id, userRole, accountError, currentView]);

  const [caseDocumentsLoading, setCaseDocumentsLoading] = useState(false);
  const [caseDocumentsError, setCaseDocumentsError] = useState("");
  const documentRevisions = useRef(new Map<string, number>());
  useEffect(() => {
    if (!session || currentView !== ViewType.INSURANCE_CLAIM || !selectedInsuranceClaimId || accountError) return;
    let cancelled = false;
    const context = dataContext.current;
    setCaseDocumentsLoading(true); setCaseDocumentsError("");
    const refresher = backgroundRefresh(async () => {
      const revision = documentRevisions.current.get(selectedInsuranceClaimId) || 0;
      let query = supabase.from("leads").select("documents").eq("id", selectedInsuranceClaimId);
      if (userRole === "contractor") {
        if (!activeOrganization) { if (!cancelled) setCaseDocumentsLoading(false); return; }
        query = query.eq("organization_id", activeOrganization.id);
      }
      const { data, error } = await query.maybeSingle();
      if (cancelled || context !== dataContext.current) return;
      if (revision !== (documentRevisions.current.get(selectedInsuranceClaimId) || 0)) { void refresher.refresh(); return; }
      setCaseDocumentsLoading(false);
      if (error) { setCaseDocumentsError("No se pudieron cargar los documentos del caso. Se reintentará automáticamente."); return; }
      setCaseDocumentsError("");
      if (!data) return;
      caseDocumentCache.current.set(selectedInsuranceClaimId, data.documents || []);
      setInsuranceClaims(prev => prev.map(claim => claim.id === selectedInsuranceClaimId ? { ...claim, documents: data.documents || [] } : claim));
    });
    void refresher.refresh();
    const interval = setInterval(() => void refresher.refresh(), 30_000);
    document.addEventListener("visibilitychange", refresher.refresh);
    const channel = supabase.channel(`case-documents-${session.user.id}-${selectedInsuranceClaimId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${selectedInsuranceClaimId}` }, refresher.refresh).subscribe();
    return () => { cancelled = true; refresher.stop(); clearInterval(interval); document.removeEventListener("visibilitychange", refresher.refresh); void supabase.removeChannel(channel); };
  }, [session?.user.id, activeOrganization?.id, userRole, currentView, selectedInsuranceClaimId, accountError]);

  // Filtered lists (fallback logic for local rendering)
  const filteredInsuranceClaims = insuranceClaims;
  const directoryClaims = userRole === "admin"
    ? [...leads, ...insuranceClaims]
    : activeOrganization
      ? insuranceClaims.filter((claim) => claim.organizationId === activeOrganization.id)
      : [];
  const activeInsuranceClaimId = selectedInsuranceClaimId === ""
    ? ""
    : (filteredInsuranceClaims.some(c => c.id === selectedInsuranceClaimId) ? selectedInsuranceClaimId : "");

  const headerSearchResults = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return filteredInsuranceClaims.filter(c => (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.claimNumber && c.claimNumber.toLowerCase().includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.policyNumber && c.policyNumber.toLowerCase().includes(term)) ||
      (c.assignedRep && c.assignedRep.toLowerCase().includes(term))
    ));
  }, [searchTerm, filteredInsuranceClaims]);

  const handleUpdateTeamMember = async (
    memberId: string,
    updatedData: {
      name: string;
      phone: string;
      address: string;
      avatarFile?: File;
      companyName?: string;
      organizationId?: string;
      companyEmail?: string;
      companyWebsite?: string;
      registrationNumber?: string;
      licenseNumber?: string;
    }
  ) => {
    if (!session) return false;

    let finalAvatarUrl = undefined;
    if (updatedData.avatarFile) {
      const fileExt = updatedData.avatarFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `avatars/${memberId}_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, updatedData.avatarFile);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
        finalAvatarUrl = publicUrl;
      }
    }

    // 1. Actualizar el perfil del usuario
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: updatedData.name,
        phone: updatedData.phone,
        address: updatedData.address,
        ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {}),
        company_email: updatedData.companyEmail || null,
        company_website: updatedData.companyWebsite || null,
        registration_number: updatedData.registrationNumber || null,
        license_number: updatedData.licenseNumber || null
      })
      .eq('id', memberId);

    if (profileError) {
      alert("Error al actualizar perfil: " + profileError.message);
      return false;
    }

    // 2. Si es contratista y tiene una organización asignada, actualizar también el nombre de la empresa
    if (updatedData.companyName && updatedData.organizationId) {
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          name: updatedData.companyName,
          company_name: updatedData.companyName
        })
        .eq('id', updatedData.organizationId);

      if (orgError) {
        alert("Error al actualizar la organización: " + orgError.message);
        return false;
      }
    }

    await fetchTeamMembers();
    return true;
  };

  const handleUpdateOrganizationBranding = async (
    organizationId: string,
    branding: {
      companyName: string;
      companyEmail: string;
      companyPhone: string;
      companyAddress: string;
      companyWebsite: string;
      registrationNumber: string;
      licenseNumber: string;
      primaryColor: string;
      accentColor: string;
      retailTaxPercent: string;
      retailDefaultFee: string;
      logoFile?: File;
    }
  ) => {
    if (!session) return false;

    let logoUrl = activeOrganization?.id === organizationId ? activeOrganization.logo_url : undefined;
    if (branding.logoFile) {
      const extension = branding.logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `company-logos/${organizationId}/brand-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, branding.logoFile, { upsert: true, contentType: branding.logoFile.type });

      if (uploadError) {
        alert("No se pudo guardar el logo de la empresa: " + uploadError.message);
        return false;
      }
      logoUrl = supabase.storage.from("documents").getPublicUrl(filePath).data.publicUrl;
    }

    const organizationPatch = {
      name: branding.companyName.trim(),
      company_name: branding.companyName.trim(),
      company_email: branding.companyEmail.trim() || null,
      company_phone: branding.companyPhone.trim() || null,
      company_address: branding.companyAddress.trim() || null,
      company_website: branding.companyWebsite.trim() || null,
      registration_number: branding.registrationNumber.trim() || null,
      license_number: branding.licenseNumber.trim() || null,
      brand_primary_color: branding.primaryColor,
      brand_accent_color: branding.accentColor,
      retail_tax_rate: Number(branding.retailTaxPercent) / 100,
      retail_default_fee: Number(branding.retailDefaultFee),
      ...(logoUrl ? { logo_url: logoUrl } : {})
    };

    const { data: updatedOrganization, error } = await supabase
      .from("organizations")
      .update(organizationPatch)
      .eq("id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !updatedOrganization) {
      alert("No se pudo guardar la identidad de la empresa: " + (error?.message || "No tienes permisos para editar esta organización."));
      return false;
    }

    setOrganizations(previous => previous.map(org => org.id === organizationId ? { ...org, ...organizationPatch, logo_url: logoUrl || org.logo_url } : org));
    setActiveOrganization(previous => previous?.id === organizationId ? { ...previous, ...organizationPatch, logo_url: logoUrl || previous.logo_url } : previous);
    return true;
  };

  const handleUpdateMembershipAccess = async (
    organizationId: string,
    settings: {
      membership_plan: "software_only" | "pro" | "plus";
      insurance_calls_enabled: boolean;
      homeowner_followup_level: "none" | "partial" | "full";
    },
  ) => {
    if (profile?.role !== "super_admin") return false;
    const { data, error } = await supabase
      .from("organizations")
      .update(settings)
      .eq("id", organizationId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("Error al actualizar los privilegios de la empresa:", error?.message || "No se encontró la empresa.");
      return false;
    }
    setOrganizations(previous => previous.map(organization => organization.id === organizationId ? { ...organization, ...settings } : organization));
    setActiveOrganization(previous => previous?.id === organizationId ? { ...previous, ...settings } : previous);
    return true;
  };

  const handleAddTeamMember = async (newMember: Omit<TeamMember, "id" | "avatar" | "status">) => {
    if (!session || !canManageTeam) throw new Error('No tienes permisos para invitar usuarios.');
    const dbRole = newMember.roleCategory === 'admin' ? 'super_admin' : newMember.roleCategory === 'staff'
      ? 'platform_staff' : newMember.roleCategory === 'contractor' ? 'owner' : 'employee';
    const organizationId = ['super_admin', 'platform_staff'].includes(dbRole) ? null
      : userRole === 'contractor' ? activeOrganization?.id : newMember.organizationId;
    let signupData: Record<string, string> | undefined;
    if (dbRole === 'employee') {
      const { data: organization, error: organizationError } = await supabase
        .from('organizations').select('invite_code').eq('id', organizationId).single();
      if (organizationError || !organization?.invite_code) throw new Error('No se pudo verificar el código de invitación de la empresa.');
      signupData = { companyCode: organization.invite_code, jobTitle: newMember.role };
    }
    const { error } = await supabase.rpc('save_xapcon_invitation', {
      p_email: newMember.email?.trim().toLowerCase(), p_full_name: newMember.name.trim(), p_role: dbRole,
      p_organization_id: organizationId || null, p_job_title: newMember.role,
      p_company_details: { phone: newMember.phone, companyEmail: newMember.companyEmail, companyWebsite: newMember.companyWebsite,
        registrationNumber: newMember.registrationNumber, licenseNumber: newMember.licenseNumber }
    });
    if (error) throw new Error(error.message);
    const { error: inviteError } = await supabase.auth.signInWithOtp({
      email: newMember.email!.trim(), options: {
        shouldCreateUser: true, emailRedirectTo: window.location.origin, data: signupData
      }
    });
    // Preserve the pending invitation on an email failure so the owner can retry.
    if (inviteError) throw new Error(`La invitación quedó pendiente, pero no se pudo enviar el correo: ${inviteError.message}. Puedes reenviarla desde este formulario.`);
  };

  const handleDeleteTimelineEvent = async (leadId: string, eventId: string) => {
    const { data, error } = await supabase.rpc('delete_xapcon_timeline_event', { p_lead_id: leadId, p_event_id: eventId });
    if (error) { alert(`No se pudo eliminar la nota: ${error.message}`); return; }
    const timeline = data as TimelineEvent[];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, timeline } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, timeline } : l));
  };

  const handleUpdateStaffAccess = async (userId: string, organizationIds: string[]) => {
    const { error } = await supabase.rpc('set_xapcon_staff_organizations', { p_user_id: userId, p_organization_ids: organizationIds });
    if (error) throw new Error(error.message);
    await fetchTeamMembers();
  };

  const handleAddLead = async (newLeadData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    if (!session) throw new Error("Tu sesión expiró. Inicia sesión de nuevo antes de guardar.");

    let targetOrgId = newLeadData.organizationId || null;
    if (!targetOrgId) {
      if (userRole === "contractor") {
        targetOrgId = activeOrganization?.id;
      } else {
        const currentOrg = organizations.find(o => o.id === selectedCompanyFilter);
        targetOrgId = currentOrg?.id || organizations[0]?.id || null;
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: newLeadData.name,
        status: "Nuevo",
        address: newLeadData.address,
        phone: newLeadData.phone,
        email: newLeadData.email,
        property_type: newLeadData.propertyType,
        sqft: newLeadData.sqft,
        insurance_provider: newLeadData.insuranceProvider,
        claim_number: newLeadData.claimNumber,
        adjuster_name: newLeadData.adjusterName,
        assigned_rep: newLeadData.assignedRep,
        organization_id: targetOrgId,
        is_insurance_claim: false,
        timeline: [
          {
            id: `t-${Date.now()}`,
            type: "system",
            author: "System Event",
            title: "Lead Creado",
            content: "Creado manualmente en el CRM",
            timestamp: "Justo ahora"
          }
        ],
        tasks: [],
        documents: []
      })
      .select()
      .single();

    if (error) {
      console.error("Error al crear lead:", error.message);
      throw new Error(error.message);
    }

    if (data) {
      await fetchLeads();
      return;
    }
    throw new Error("Supabase no devolvió el lead guardado.");
  };

  // Actions: Insurance Claims View
  const handleSelectInsuranceClaim = (claimId: string) => {
    setSelectedInsuranceClaimId(claimId);
  };

  const handleNavigateToInsuranceClaim = (claimId: string, organizationId?: string) => {
    if (userRole === "contractor" && !insuranceClaims.some((claim) => claim.id === claimId && claim.organizationId === activeOrganization?.id)) return;
    setSelectedInsuranceClaimId(claimId);
    navigateToView(ViewType.INSURANCE_CLAIM, organizationId || insuranceClaims.find((claim) => claim.id === claimId)?.organizationId);
  };

  const handleAddInsuranceClaimTimelineEvent = async (claimId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => {
    const { data, error } = await supabase.rpc('add_xapcon_timeline_event', { p_lead_id: claimId, p_event: event });
    if (error) {
      await caseFileService.queueOrphans(claimId, (event.photos || []).map(url => ({ url })));
      void caseFileService.flushCleanup();
      throw new Error(error.message);
    }
    const timeline = data as TimelineEvent[];
    setInsuranceClaims(prev => prev.map(l => l.id === claimId ? { ...l, timeline } : l));
    setLeads(prev => prev.map(l => l.id === claimId ? { ...l, timeline } : l));
    window.dispatchEvent(new Event('xapcon-notifications-changed'));
  };

  const handleToggleInsuranceClaimTask = async (claimId: string, taskId: string) => {
    const claim = insuranceClaims.find(l => l.id === claimId) || leads.find(l => l.id === claimId);
    const task = claim?.tasks.find(t => t.id === taskId);
    if (!task) return;
    const { data, error } = await supabase.rpc('set_xapcon_task_completed', {
      p_lead_id: claimId, p_task_id: taskId, p_completed: task.status !== 'completed'
    });
    if (error) { alert(`No se pudo actualizar la tarea: ${error.message}`); return; }
    const tasks = data as TaskItem[];
    setLeads(prev => prev.map(l => l.id === claimId ? { ...l, tasks } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === claimId ? { ...l, tasks } : l));
    window.dispatchEvent(new Event('xapcon-notifications-changed'));
  };

  const handleAddTask = async (leadId: string, taskTitle: string, assignedToId?: string,
    details?: { dueDate?: string; priority?: 'high' | 'medium' | 'low'; kind?: TaskItem['kind']; category?: TaskItem['category']; scheduledTime?: string }
  ) => {
    const claim = insuranceClaims.find(l => l.id === leadId) || leads.find(l => l.id === leadId);
    if (assignedToId && !eligibleCaseMembers(teamMembers, claim?.organizationId).some(m => m.id === assignedToId))
      throw new Error('El responsable no pertenece a la empresa de este caso.');
    const { data, error } = await supabase.rpc('add_xapcon_task', {
      p_lead_id: leadId, p_title: taskTitle, p_assigned_to: assignedToId || null, p_details: details || {}
    });
    if (error) throw new Error(error.message);
    const tasks = data as TaskItem[];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, tasks } : l));
    window.dispatchEvent(new Event('xapcon-notifications-changed'));
  };

  const handleNotificationClick = async (notification: { reference_id?: string; reference_type?: string; organization_id?: string }) => {
    if (!notification.reference_id || notification.reference_type !== 'lead') return;
    const { data, error } = await supabase.from('leads').select('id, organization_id, is_insurance_claim').eq('id', notification.reference_id).single();
    if (error || !data) { alert('El caso ya no está disponible o no tienes acceso.'); return; }
    if (activeOrganization?.id !== data.organization_id) {
      const org = organizations.find(o => o.id === data.organization_id);
      if (org) setActiveOrganization(org);
    }
    if (data.is_insurance_claim) handleNavigateToInsuranceClaim(data.id, data.organization_id);
    else if (userRole === "contractor") navigateToView(ViewType.CLAIMS);
    else navigateToView(ViewType.DASHBOARD);
  };

  const handleAddInsuranceClaim = async (newClaimData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    if (!session) throw new Error("Tu sesión expiró. Inicia sesión de nuevo antes de guardar.");

    // For superadmins, the company chosen in the app header is authoritative
    // whenever a single company is selected. The form can still hold a stale
    // organization ID if it was opened while the consolidated view was active.
    // In the consolidated view, honor the explicit company chosen in the form;
    // never silently fall back to the first organization.
    const targetOrgId = activeOrganization?.id || newClaimData.organizationId || null;
    if (!targetOrgId) throw new Error("Selecciona una empresa contratista antes de registrar el reclamo.");

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: newClaimData.name,
        status: "Nuevo",
        address: newClaimData.address,
        phone: newClaimData.phone,
        phone2: newClaimData.phone2,
        email: newClaimData.email,
        email2: newClaimData.email2,
        property_type: newClaimData.propertyType,
        sqft: newClaimData.sqft,
        insurance_provider: newClaimData.insuranceProvider,
        claim_number: newClaimData.claimNumber,
        policy_number: newClaimData.policyNumber,
        damage_type: newClaimData.damageType,
        loss_date: newClaimData.lossDate,
        insurance_phone1: newClaimData.insurancePhone1,
        insurance_phone2: newClaimData.insurancePhone2,
        insurance_email1: newClaimData.insuranceEmail1,
        insurance_email2: newClaimData.insuranceEmail2,
        notes: newClaimData.notes,
        insurance_notes: newClaimData.insuranceNotes,
        adjuster_name: newClaimData.adjusterName,
        assigned_rep: newClaimData.assignedRep,
        organization_id: targetOrgId,
        is_insurance_claim: true,
        timeline: [
          {
            id: `t-${Date.now()}`,
            type: "system",
            author: "System Event",
            title: "Reclamación de Seguro Creada",
            content: "Creado manualmente en el CRM",
            timestamp: "Justo ahora"
          }
        ],
        tasks: [],
        documents: []
      })
      .select()
      .single();

    if (error) {
      console.error("Error al crear reclamación:", error.message);
      throw new Error(error.message);
    }

    if (data) {
      await fetchLeads();
      setSelectedInsuranceClaimId(data.id);
      return true;
    }
    throw new Error("Supabase no devolvió el reclamo guardado.");
  };

  // Actions: Document Management
  const handleUploadDocuments = async (leadId: string, files: File[], category: string = "Reporte") => {
    if (!session || files.length === 0) return false;
    if (files.length > 20) { alert("Selecciona como máximo 20 archivos por carga."); return false; }
    const uploaded: any[] = [];
    try {
      for (const file of files) uploaded.push(await caseFileService.upload(leadId, file, category));
      const documents = await caseFileService.append(leadId, uploaded);
      caseDocumentCache.current.set(leadId, documents);
      documentRevisions.current.set(leadId, (documentRevisions.current.get(leadId) || 0) + 1);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, documents } : l));
      setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, documents } : l));
      return true;
    } catch (error) {
      // The RPC may have committed even if its response was lost. The server
      // checks references under a row lock before scheduling any orphan cleanup.
      await caseFileService.queueOrphans(leadId, uploaded);
      await caseFileService.flushCleanup();
      alert(error instanceof Error ? error.message : "No se pudieron guardar los documentos.");
      return false;
    }
  };

  const handleDeleteDocument = async (leadId: string, docId: string) => {
    if (!session) return false;
    try {
      const result = await caseFileService.remove(leadId, docId);
      caseDocumentCache.current.set(leadId, result.documents);
      documentRevisions.current.set(leadId, (documentRevisions.current.get(leadId) || 0) + 1);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, documents: result.documents } : l));
      setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, documents: result.documents } : l));
      // A durable database queue retains failed Storage deletions for retry.
      void caseFileService.flushCleanup();
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo eliminar el documento.");
      return false;
    }
  };

  const handleUploadImageForTimeline = async (file: File, claimId: string) => {
    if (!session) return null;
    const uploaded = await caseFileService.upload(claimId, file, "Foto");
    return `storage://case-files/${uploaded.filePath}`;
  };


  // Actions: Claims Estimator View (Persisted in Supabase Leads)
  const handleUpdateLeadEstimate = async (leadId: string, updatedEstimate: Estimate) => {
    const { error } = await supabase
      .from('leads')
      .update({ estimate: userRole === "admin" ? updatedEstimate : publicEstimate(updatedEstimate) })
      .eq('id', leadId);

    if (error) {
      console.error("Error al guardar estimación:", error.message);
      alert("Error al guardar estimación: " + error.message);
      return;
    }

    // Actualizar estado local
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estimate: updatedEstimate } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, estimate: updatedEstimate } : l));
  };

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      console.error("Error al eliminar lead/estimación:", error.message);
      alert("Error al eliminar: " + error.message);
      return;
    }

    setLeads(prev => prev.filter(l => l.id !== leadId));
    setInsuranceClaims(prev => prev.filter(c => c.id !== leadId));

    if (selectedInsuranceClaimId === leadId) setSelectedInsuranceClaimId("");
  };

  const handleUpdateLead = async (leadId: string, updatedFields: Partial<Lead>) => {
    if (!session) return;

    const updatePayload: any = {};
    if (updatedFields.name !== undefined) updatePayload.name = updatedFields.name;
    if (updatedFields.address !== undefined) updatePayload.address = updatedFields.address;
    if (updatedFields.phone !== undefined) updatePayload.phone = updatedFields.phone;
    if (updatedFields.phone2 !== undefined) updatePayload.phone2 = updatedFields.phone2;
    if (updatedFields.email !== undefined) updatePayload.email = updatedFields.email;
    if (updatedFields.email2 !== undefined) updatePayload.email2 = updatedFields.email2;
    if (updatedFields.sqft !== undefined) updatePayload.sqft = updatedFields.sqft;
    if (updatedFields.insuranceProvider !== undefined) updatePayload.insurance_provider = updatedFields.insuranceProvider;
    if (updatedFields.claimNumber !== undefined) updatePayload.claim_number = updatedFields.claimNumber;
    if (updatedFields.policyNumber !== undefined) updatePayload.policy_number = updatedFields.policyNumber;
    if (updatedFields.damageType !== undefined) updatePayload.damage_type = updatedFields.damageType;
    if (updatedFields.lossDate !== undefined) updatePayload.loss_date = updatedFields.lossDate || null;
    if (updatedFields.insurancePhone1 !== undefined) updatePayload.insurance_phone1 = updatedFields.insurancePhone1;
    if (updatedFields.insurancePhone2 !== undefined) updatePayload.insurance_phone2 = updatedFields.insurancePhone2;
    if (updatedFields.insuranceEmail1 !== undefined) updatePayload.insurance_email1 = updatedFields.insuranceEmail1;
    if (updatedFields.insuranceEmail2 !== undefined) updatePayload.insurance_email2 = updatedFields.insuranceEmail2;
    if (updatedFields.insuranceNotes !== undefined) updatePayload.insurance_notes = updatedFields.insuranceNotes;
    if (updatedFields.adjusterName !== undefined) updatePayload.adjuster_name = updatedFields.adjusterName;
    if (updatedFields.assignedRep !== undefined) updatePayload.assigned_rep = updatedFields.assignedRep;
    if (updatedFields.organizationId !== undefined) updatePayload.organization_id = updatedFields.organizationId;
    if (updatedFields.status !== undefined) updatePayload.status = updatedFields.status;
    if (updatedFields.estimate !== undefined) updatePayload.estimate = updatedFields.estimate;

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId);

    if (error) {
      console.error("Error al actualizar lead:", error.message);
      const missingInsuranceNotes = error.message.includes("insurance_notes") && error.message.toLowerCase().includes("schema cache");
      const missingInsuranceNotesPermission = error.message.toLowerCase().includes("permission denied for table leads");
      alert(missingInsuranceNotes
        ? "Supabase aún no reconoce la columna insurance_notes. Ejecuta schema_insurance_claim_notes.sql en tu proyecto de Supabase y vuelve a guardar."
        : missingInsuranceNotesPermission
          ? "Supabase no permite actualizar insurance_notes. Vuelve a ejecutar schema_insurance_claim_notes.sql en tu proyecto de Supabase y vuelve a guardar."
          : "Error al guardar cambios: " + error.message);
    } else {
      // Optimistic local update instead of full refetch (avoids race conditions)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields } : l));
      setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedFields } : l));
    }
  };

  // Actions: Production Kanban View connected to Supabase Leads
  const handleMoveProject = async (projectId: string, direction: "next" | "prev") => {
    const stages = [
      "Negados",
      "Inspección",
      "En disputa",
      "Esperando Scope",
      "Aprobado y Suplementado",
      "Construcción",
      "Esperando Depreciación",
      "Finalizado",
      "Cancelado"
    ];

    const claim = insuranceClaims.find(c => c.id === projectId);
    if (!claim) return;

    let currentIdx = stages.indexOf(claim.status);
    if (currentIdx === -1) {
      if (claim.status === "Nuevo") {
        currentIdx = 0;
      } else {
        currentIdx = 1;
      }
    }

    let newIdx = currentIdx;
    if (direction === "next" && currentIdx < stages.length - 1) newIdx++;
    if (direction === "prev" && currentIdx > 0) newIdx--;

    const newStatus = stages[newIdx];
    if (newStatus === claim.status) return;

    // Update locally immediately for optimistic UI
    setInsuranceClaims(prev => prev.map(c => c.id === projectId ? { ...c, status: newStatus } : c));
    setLeads(prev => prev.map(c => c.id === projectId ? { ...c, status: newStatus } : c));

    // Update in Supabase
    if (session) {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) {
        console.error("Error updating claim status:", error.message);
        setInsuranceClaims(prev => prev.map(c => c.id === projectId ? { ...c, status: claim.status } : c));
        setLeads(prev => prev.map(c => c.id === projectId ? { ...c, status: claim.status } : c));
        return;
      }

      const { data: timeline, error: timelineError } = await supabase.rpc('add_xapcon_timeline_event', {
        p_lead_id: projectId,
        p_event: {
          type: 'status_change',
          title: 'Cambio de etapa',
          content: `${claim.status} → ${newStatus}`,
          fromStatus: claim.status,
          toStatus: newStatus,
        },
      });
      if (timelineError) {
        console.error("Error registrando el cambio de etapa:", timelineError.message);
      } else {
        setInsuranceClaims(prev => prev.map(c => c.id === projectId ? { ...c, timeline: timeline as TimelineEvent[] } : c));
        setLeads(prev => prev.map(c => c.id === projectId ? { ...c, timeline: timeline as TimelineEvent[] } : c));
      }
    }
  };
  if (passwordRecovery && session) return <Suspense fallback={<p role="status">Cargando…</p>}><PasswordRecoveryView onComplete={finishPasswordRecovery} /></Suspense>;
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#102A46] text-white">Cargando plataforma...</div>;
  }

  if (!session) {
    return <Suspense fallback={<p role="status">Cargando…</p>}><LoginView /></Suspense>;
  }

  if (accountError || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] p-6">
      <div className="max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#102A46]">No se pudo preparar tu cuenta</h1>
        <p role="alert" className="my-4 text-sm text-slate-600">{accountError || 'No se encontró tu perfil.'}</p>
        <div className="flex gap-3"><button onClick={retryAccount} className="rounded-lg bg-[#102A46] px-4 py-2 text-white">Reintentar</button>
          <button onClick={signOut} className="rounded-lg border px-4 py-2">Cerrar sesión</button></div>
      </div>
    </div>
  );

  const negadosCount = filteredInsuranceClaims.filter(c => c.status === 'Negados').length;
  const enDisputaCount = filteredInsuranceClaims.filter(c => c.status === 'En disputa').length;
  const esperandoScopeCount = filteredInsuranceClaims.filter(c => c.status === 'Esperando Scope').length;
  const esperandoDepreciacionCount = filteredInsuranceClaims.filter(c => c.status === 'Esperando Depreciación').length;
  const finalizadoCount = filteredInsuranceClaims.filter(c => c.status === 'Finalizado').length;
  const canceladoCount = filteredInsuranceClaims.filter(c => c.status === 'Cancelado').length;

  // Custom KPI logic:
  // "el valor de 'casos activos' es la suma de todos los casos, menos los finalizados, menos los negados, menos los cancelados."
  const casosActivosCount = filteredInsuranceClaims.length - finalizadoCount - negadosCount - canceladoCount;
  // "los casos 'Construidos' debe siempre ser igual al valor de los casos finalizados, mas los de esperando depreciación."
  const construidosCount = finalizadoCount + esperandoDepreciacionCount;

  return (
    <ContractorDesignContext.Provider value={userRole === "contractor" || userRole === "admin"}>
    <div className={`${userRole === "contractor" ? "contractor-app" : "admin-app"} min-h-screen flex flex-col md:flex-row bg-[#F4F6F8] text-[#191c1e] font-sans antialiased overflow-hidden`}>

      {/* Sidebar - Desktop */}
      {userRole === "contractor" ? (
      <ContractorNavigation
        currentView={currentView}
        onViewChange={(view) => {
          navigateToView(view);
          setMobileMenuOpen(false);
          setSelectedInsuranceClaimId("");
          setSearchTerm("");
        }}
        onLogout={signOut}
        company={activeOrganization?.company_name || contractorCompany}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      ) : (
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          navigateToView(view);
          setMobileMenuOpen(false);
          setSelectedInsuranceClaimId("");
          setSearchTerm("");
        }}
        onLogout={signOut}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      )}

      {/* Header - Mobile */}
      {userRole === "admin" && <header className="no-print md:hidden flex items-center justify-between px-6 py-4 bg-[#102A46] text-white border-b border-white/15 shrink-0 select-none">
        <div className="flex items-center">
          <img
            src={logo}
            alt="Xapcon Group Logo"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:bg-white/5 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>}

      {/* Mobile Drawer Navigation links */}
      {mobileMenuOpen && userRole === "admin" && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-[#102A46] z-50 p-6 flex flex-col space-y-3 animate-fade-in select-none">
          {[
            { id: ViewType.DASHBOARD, label: "Dashboard" },
            { id: ViewType.INSURANCE_CLAIM, label: "Insurance Claim" },
            { id: ViewType.PRODUCTION, label: "Production Pipeline" },
            ...(userRole === "admin" ? [
              { id: ViewType.INSURANCE_DIRECTORY, label: "Directorio Aseguradoras" },
              { id: ViewType.VALORES_INSURANCE, label: "Valores Insurance" },
              { id: ViewType.CONTRACTOR_CASE_REPORTS, label: "Informes por empresa" },
            ] : []),
            { id: ViewType.TEAM, label: "Personal & Crews" },
            { id: ViewType.SETTINGS, label: "Configuración" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                navigateToView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentView === item.id
                  ? "bg-[#8C6A22] text-[#102A46] font-bold"
                  : "text-[#CFD9E1] hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-400 hover:text-red-300 hover:bg-white/5 transition-all mt-4 border-t border-white/10 pt-4"
          >
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* Main Container Content viewport */}
      <main data-sidebar-collapsed={sidebarCollapsed} className={`crm-main flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:ml-[76px]" : "md:ml-[280px]"}`}>

        {/* Visual Top Bar for Company Selection */}
        {userRole === "admin" && (
          <div className="crm-topbar admin-topbar no-print bg-white border-b border-[#DCE4EB]/30 px-6 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0 select-none shadow-sm">
            {/* Left: Admin Welcome + Live Clock & Company Filter */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col justify-center">
                <span className="font-display whitespace-nowrap text-[14px] font-semibold text-[#1e293b] tracking-[-0.02em]">
                  Bienvenido, {profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || "Usuario"}
                </span>
                <LiveDateTime />
              </div>

              <div className="h-7 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa</span>
                <div className="admin-company-filter" ref={companyFilterRef}>
                  <button
                    type="button"
                    className="admin-company-filter-trigger"
                    aria-haspopup="dialog"
                    aria-expanded={companyFilterOpen}
                    aria-label={`Empresa seleccionada: ${activeOrganization?.name || "Todas las empresas"}`}
                    onClick={() => setCompanyFilterOpen(open => !open)}
                  >
                    <span className="admin-company-filter-icon"><Building2 aria-hidden="true" /></span>
                    <span className="admin-company-filter-copy">
                      <span className="admin-company-filter-name">{activeOrganization?.name || "Todas las empresas"}</span>
                      <span className="admin-company-filter-caption">{activeOrganization ? "Empresa seleccionada" : "Vista consolidada"}</span>
                    </span>
                    <ChevronDown className={`admin-company-filter-chevron${companyFilterOpen ? " is-open" : ""}`} aria-hidden="true" />
                  </button>
                  {companyFilterOpen && (
                    <div className="admin-company-filter-menu" role="dialog" aria-label="Seleccionar empresa">
                      <div className="admin-company-filter-options">
                        {[{ id: "Todas", name: "Todas las empresas", description: "Vista consolidada", isAll: true }, ...organizations.filter(org => !org.is_internal && org.name.trim().toLowerCase() !== "xapcon group").map(org => ({ id: org.id, name: org.name, description: "Empresa", isAll: false }))]
                          .map(option => {
                            const selected = option.id === "Todas" ? !activeOrganization : activeOrganization?.id === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                aria-pressed={selected}
                                className={`admin-company-filter-option${selected ? " is-selected" : ""}`}
                                onClick={() => {
                                  handleSetCompanyFilter(option.id);
                                  setCompanyFilterOpen(false);
                                }}
                              >
                                <span className="admin-company-filter-option-icon"><Building2 aria-hidden="true" /></span>
                                <span className="admin-company-filter-option-copy"><strong>{option.name}</strong><small>{option.description}</small></span>
                                {selected && <Check className="admin-company-filter-option-check" aria-hidden="true" />}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-auto relative px-4 w-full">
              <input
                type="text"
                placeholder="Buscar homeowner, claim o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-[#F4F6F8] border border-[#DCE4EB]/60 rounded-xl text-xs text-[#102A46] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8C6A22] focus:border-[#8C6A22] shadow-sm transition-all"
              />
              <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Search Autocomplete Dropdown Results */}
              {searchTerm.trim() !== "" && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-[#E2E4EA] rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-[#DCE4EB]/20">
                  {headerSearchResults.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center font-medium">
                      No se encontraron casos que coincidan con "<span className="font-bold">{searchTerm}</span>".
                    </div>
                  ) : (
                    headerSearchResults.map((claim) => (
                      <div
                        key={claim.id}
                        onClick={() => {
                          handleNavigateToInsuranceClaim(claim.id);
                          setSearchTerm("");
                        }}
                        className="p-3 hover:bg-[#F8F9FB] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#102A46] group-hover:text-[#664A14] transition-colors truncate">
                              {claim.name}
                            </span>
                            {claim.claimNumber && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 shrink-0">
                                {claim.claimNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {claim.address || "Sin dirección"}
                          </p>
                        </div>

                        <div className="flex items-center shrink-0">
                          <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#664A14] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right: Superadmin Badge & Notifications */}
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Super Admin
              </span>
              <div className="border-l border-gray-200 pl-3">
                <NotificationBell
                  userId={session.user.id}
                  organizationId={activeOrganization?.id}
                  onNotificationClick={handleNotificationClick}
                  callReminderLeads={insuranceClaims}
                  onCallReminderClick={handleNavigateToInsuranceClaim}
                  callAlertsEnabled
                  homeownerReminderLeads={insuranceClaims}
                  onHomeownerReminderClick={handleNavigateToInsuranceClaim}
                  homeownerAlertsEnabled
                />
              </div>
            </div>
          </div>
        )}

        {userRole === "contractor" && (
          <div className="crm-topbar contractor-topbar no-print bg-white border-b border-[#DCE4EB]/30 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 select-none shadow-sm">
            {/* Company Logo & Welcome Header */}
            <div className="contractor-topbar-brand">
              {activeOrganization?.logo_url && (
                <span className="contractor-topbar-logo">
                  <img
                    src={activeOrganization.logo_url}
                    alt={`${activeOrganization.company_name || activeOrganization.name} logo`}
                    onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
                  />
                </span>
              )}
              <div className="contractor-topbar-intro">
                <span className="contractor-topbar-greeting">
                  Bienvenido, {profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || "Usuario"}
                </span>
                <LiveDateTime />
              </div>
              <ContractorWeather address={activeOrganization?.company_address} />
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-auto relative px-4 w-full">
              <input
                type="text"
                placeholder="Buscar homeowner, claim o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-[#F4F6F8] border border-[#DCE4EB]/60 rounded-xl text-xs text-[#102A46] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8C6A22] focus:border-[#8C6A22] shadow-sm transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="size-4" aria-hidden="true" />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-500 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Search Autocomplete Dropdown Results */}
              {searchTerm.trim() !== "" && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-[#E2E4EA] rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-[#DCE4EB]/20">
                  {headerSearchResults.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 text-center font-medium">
                      No se encontraron casos que coincidan con "<span className="font-bold">{searchTerm}</span>".
                    </div>
                  ) : (
                    headerSearchResults.map((claim) => (
                      <div
                        key={claim.id}
                        onClick={() => {
                          handleNavigateToInsuranceClaim(claim.id);
                          setSearchTerm("");
                        }}
                        className="p-3 hover:bg-[#F8F9FB] cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#102A46] group-hover:text-[#664A14] transition-colors truncate">
                              {claim.name}
                            </span>
                            {claim.claimNumber && (
                              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 shrink-0">
                                {claim.claimNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {claim.address || "Sin dirección"}
                          </p>
                        </div>

                        <div className="flex items-center shrink-0">
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">

              {organizations.length > 1 && <label className="text-xs font-semibold text-[#102A46]">Empresa
                <select aria-label="Cambiar empresa" value={activeOrganization?.id || ''} onChange={e => {
                  const org = organizations.find(o => o.id === e.target.value); if (org) { setActiveOrganization(org); setSelectedInsuranceClaimId(''); }
                }} className="ml-2 rounded-lg border bg-white p-2">
                  {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </label>}
              <div className="border-l border-gray-200 pl-4">
                <NotificationBell
                  userId={session.user.id}
                  organizationId={activeOrganization?.id}
                  onNotificationClick={handleNotificationClick}
                  callReminderLeads={[]}
                />
              </div>
            </div>
          </div>
        )}

        {/* View selections viewport */}
        <div className="crm-content flex flex-col flex-1 overflow-hidden">
          {leadLoadError && <div role="alert" className="bg-amber-50 p-3 text-sm text-amber-900">{leadLoadError} <button type="button" onClick={() => void fetchLeads()} className="underline">Reintentar</button></div>}
          {userRole === "admin" && estimatePrivacyError && <p role="alert" className="bg-amber-50 p-3 text-sm text-amber-900">{estimatePrivacyError}</p>}
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-500">Cargando sección…</div>}>
          {currentView === ViewType.DASHBOARD && (
            userRole === "contractor" ? (
              <ContractorDashboard
                claims={filteredInsuranceClaims}
                teamMembers={teamMembers}
                currentUserId={session.user.id}
                membershipPlan={activeOrganization?.membership_plan === "pro" || activeOrganization?.membership_plan === "plus" ? activeOrganization.membership_plan : undefined}
                defaultTaskScope={canManageTeam ? "all" : "mine"}
                onNavigateToView={navigateToView}
                onNavigateToLead={handleNavigateToInsuranceClaim}
                onCreateClaim={() => {
                  setSelectedInsuranceClaimId("");
                  setOpenClaimFormOnEnter(true);
                  navigateToView(ViewType.INSURANCE_CLAIM);
                }}
                onToggleTask={handleToggleInsuranceClaimTask}
                onAddTask={handleAddTask}
              />
            ) : (
              <MainDashboard
                kpis={[
                  { title: "Casos Activos", value: `${casosActivosCount}`, trend: "", trendDirection: "up", subtitle: "Total bajo gestión", icon: "check-circle" },
                  { title: "En disputa", value: `${enDisputaCount + esperandoScopeCount}`, trend: "", trendDirection: "up", subtitle: "Trámites con aseguradora", icon: "scale" },
                  { title: "Construidos", value: `${construidosCount}`, trend: "", trendDirection: "up", subtitle: "Obras finalizadas y en curso", icon: "hard-hat" },
                  { title: "Esp. Depreciación", value: `${esperandoDepreciacionCount}`, trend: "", trendDirection: "up", subtitle: "Falta recuperar fondos", icon: "clock" },
                  { title: "Finalizados", value: `${finalizadoCount}`, trend: "", trendDirection: "up", subtitle: "Casos cerrados", icon: "flag" }
                ]}
                onNavigateToView={navigateToView}
                onNavigateToLead={handleNavigateToInsuranceClaim}
                claims={filteredInsuranceClaims}
                onToggleTask={handleToggleInsuranceClaimTask}
                taskComposer={<ContractorDashboard composerOnly claims={filteredInsuranceClaims} teamMembers={teamMembers}
                  currentUserId={session.user.id} onNavigateToView={navigateToView} onNavigateToLead={handleNavigateToInsuranceClaim}
                  onCreateClaim={() => navigateToView(ViewType.INSURANCE_CLAIM)} onToggleTask={handleToggleInsuranceClaimTask} onAddTask={handleAddTask} />}
              />
            )
          )}


          {currentView === ViewType.INSURANCE_CLAIM && (
            <ErrorBoundary>
              <LeadsView
                leads={filteredInsuranceClaims}
                documentsLoading={caseDocumentsLoading}
                documentsError={caseDocumentsError}
                selectedLeadId={activeInsuranceClaimId}
                onSelectLead={handleSelectInsuranceClaim}
                onAddTimelineEvent={handleAddInsuranceClaimTimelineEvent}
                onDeleteTimelineEvent={handleDeleteTimelineEvent}
                onAddLead={handleAddInsuranceClaim}
                onUploadDocuments={handleUploadDocuments}
                onDeleteDocument={handleDeleteDocument}
                onUploadImageForTimeline={handleUploadImageForTimeline}
                viewTitle="Expedientes de Insurance Claim"
                viewSubtitle="Cronologías de reclamos de seguros, visitas de peritos y archivos técnicos de propiedad."
                addButtonLabel="Nuevo Reclamo de Seguro"
                formTitle="Ficha de Nueva Reclamación de Seguro"
                formSubmitLabel="Registrar Reclamación"
                isInsuranceView={true}
                organizations={organizations}
                userRole={userRole}
                teamMembers={teamMembers}
                searchTerm={searchTerm}
                onUpdateLead={handleUpdateLead}
                activeOrganizationId={activeOrganization?.id}
                openCreateFormOnEnter={userRole === "contractor" && openClaimFormOnEnter}
                onCreateFormOpened={() => setOpenClaimFormOnEnter(false)}
                onMoveProject={handleMoveProject}
                insuranceCompanies={availableInsuranceCompanies}
                onSaveAdminClaimRecord={handleSaveAdminClaimRecord}
                onDeleteAdminClaimRecord={handleDeleteAdminClaimRecord}
                onAddAdminHomeownerContact={handleAddAdminHomeownerContact}
                onDeleteAdminHomeownerContact={handleDeleteAdminHomeownerContact}
              />
            </ErrorBoundary>
          )}

          {currentView === ViewType.CLAIMS && userRole === "contractor" && leadDataContext !== dataContext.current && <p role="status" className="p-6 text-sm text-slate-500">{leadLoadError ? "Los presupuestos no están disponibles." : "Cargando presupuestos…"}</p>}
          {currentView === ViewType.CLAIMS && userRole === "contractor" && leadDataContext === dataContext.current && (
            <EstimatorView
              leads={leads}
              onUpdateLeadEstimate={handleUpdateLeadEstimate}
              onAddLead={handleAddLead}
              onDeleteLead={handleDeleteLead}
            />
          )}

          {currentView === ViewType.PRODUCTION && (
            <ProductionView
              claims={filteredInsuranceClaims}
              onMoveProject={handleMoveProject}
            />
          )}

          {currentView === ViewType.INSURANCE_DIRECTORY && (
            <InsuranceDirectoryView
              claims={directoryClaims}
              onNavigateToClaim={handleNavigateToInsuranceClaim}
              canManageDirectory={userRole === "admin"}
              isSuperAdmin={userRole === "admin"}
              directoryRefreshKey={insuranceRefreshKey}
              onInsuranceRegistered={userRole === "admin" ? () => setInsuranceRefreshKey(k => k + 1) : undefined}
            />
          )}

          {currentView === ViewType.VALORES_INSURANCE && userRole === "admin" && (
            <ValuesInsuranceView claims={filteredInsuranceClaims} />
          )}

          {currentView === ViewType.CONTRACTOR_CASE_REPORTS && userRole === "admin" && (
            <ContractorCaseReportsView claims={filteredInsuranceClaims} organizations={organizations} activeOrganizationId={activeOrganization?.id} />
          )}

          {currentView === ViewType.MEMBERSHIP_ACCESS && profile?.role === "super_admin" && (
            <MembershipAccessView organizations={organizations} onSave={handleUpdateMembershipAccess} />
          )}

          {currentView === ViewType.TEAM && (
            <ErrorBoundary>
              <TeamView
                members={teamMembers}
                onAddMember={canManageTeam ? handleAddTeamMember : undefined}
                onUpdateMember={handleUpdateTeamMember}
                onUpdateStaffAccess={userRole === "admin" ? handleUpdateStaffAccess : undefined}
                userRole={userRole}
                organizations={organizations}
                userCompany={contractorCompany}
                companyInviteCode={canManageTeam && !activeOrganization?.is_internal ? activeOrganization?.invite_code : undefined}
                activeOrganizationId={activeOrganization?.id}
                currentUserId={session?.user?.id}
              />
            </ErrorBoundary>
          )}

          {currentView === ViewType.SETTINGS && (
            <ErrorBoundary>
              <SettingsView
                userRole={userRole}
                session={session}
                profile={profile}
                onProfileUpdated={patch => setProfile(previous => previous ? { ...previous, ...patch } : previous)}
                activeOrganization={activeOrganization}
                canEditCompany={userRole === 'admin' || (activeOrganization?.membership_role === "owner" && !activeOrganization?.is_internal)}
                onUpdateOrganizationBranding={handleUpdateOrganizationBranding}
              />
            </ErrorBoundary>
          )}
          </Suspense>
        </div>

      </main>
    </div>
    </ContractorDesignContext.Provider>
  );
}
