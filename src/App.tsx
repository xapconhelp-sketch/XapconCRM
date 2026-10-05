import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import logo from "../LogoNegativo-copia.png";
import { ViewType, Lead, Estimate, TeamMember, TimelineEvent, TaskItem } from "./types";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";

import Sidebar from "./components/Sidebar";
const MainDashboard = lazy(() => import("./components/MainDashboard"));
const ContractorDashboard = lazy(() => import("./components/ContractorDashboard"));
const LeadsView = lazy(() => import("./components/LeadsView"));
const EstimatorView = lazy(() => import("./components/EstimatorView"));
const ProductionView = lazy(() => import("./components/ProductionView"));
const InsuranceDirectoryView = lazy(() => import("./components/InsuranceDirectoryView"));
import { fetchDbInsuranceCompanies, getAllInsuranceCompanyNames } from "./data/insuranceDirectoryData";
const TeamView = lazy(() => import("./components/TeamView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
import LoginView from "./components/LoginView";
import { NotificationBell } from "./components/NotificationBell";
import { eligibleCaseMembers, memberBelongsToOrganization } from "./lib/teamAccess.js";
import PasswordRecoveryView from "./components/PasswordRecoveryView";
import ContractorWeather from "./components/ContractorWeather";

import { Menu, X } from "lucide-react";

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
    <span className="text-[11px] text-slate-400 font-medium tracking-wide capitalize">
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
  dataContext.current = `${session?.user.id || ''}:${activeOrganization?.id || ''}:${userRole}`;
  const contractorCompany = activeOrganization?.name || "Desconocida";
  const selectedCompanyFilter = activeOrganization?.name || "Todas";

  const handleSetCompanyFilter = (val: string) => {
    if (val === "Todas") {
      setActiveOrganization(null);
      window.history.pushState({}, '', '/admin/dashboard');
    } else {
      const org = organizations.find(o => o.id === val) || null;
      setActiveOrganization(org);
      if (org) {
        window.history.pushState({}, '', `/${userRole}/${org.id}/dashboard`);
      }
    }
  };

  // Sincronizar URL simulada al cambiar el contexto inicial
  useEffect(() => {
    if (session) {
      if (activeOrganization) {
        window.history.replaceState({}, '', `/${userRole}/${activeOrganization.id}/dashboard`);
      } else {
        window.history.replaceState({}, '', `/${userRole}/dashboard`);
      }
    }
  }, [session, activeOrganization, userRole]);

  // Views and collapsible menus
  // Never restore a view from browser storage: it may have been saved by a
  // different account (for example, a superadmin using a shared workstation).
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [openClaimFormOnEnter, setOpenClaimFormOnEnter] = useState(false);
  useEffect(() => {
    if (userRole === "contractor" && currentView === ViewType.INSURANCE_DIRECTORY) {
      setCurrentView(ViewType.DASHBOARD);
    } else if (userRole === "admin" && currentView === ViewType.CLAIMS) {
      setCurrentView(ViewType.DASHBOARD);
    }
  }, [currentView, userRole]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Core CRM States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [insuranceClaims, setInsuranceClaims] = useState<Lead[]>([]);
  const [selectedInsuranceClaimId, setSelectedInsuranceClaimId] = useState<string>(() => {
    return localStorage.getItem("crm_selected_claim_id") || "";
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [insuranceRefreshKey, setInsuranceRefreshKey] = useState(0);

  // Sync Insurance Directory with Supabase on mount
  useEffect(() => {
    if (!session) return;
    fetchDbInsuranceCompanies().then(() => {
      setInsuranceRefreshKey(k => k + 1);
    });
  }, [session]);

  const availableInsuranceCompanies = useMemo(() => {
    return getAllInsuranceCompanyNames([...leads, ...insuranceClaims]);
  }, [leads, insuranceClaims, insuranceRefreshKey]);

  useEffect(() => {
    localStorage.setItem("crm_selected_claim_id", selectedInsuranceClaimId);
  }, [selectedInsuranceClaimId]);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    setLeads([]); setInsuranceClaims([]); setTeamMembers([]);
  }, [session?.user.id, activeOrganization?.id]);

  // Carga asíncrona de datos desde Supabase
  const fetchLeads = async () => {
    if (!session || !profile) return;
    const context = dataContext.current;

    let query = supabase
      .from('leads')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false });

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

    const { data, error } = await query;
    if (error) {
      console.error("Error al obtener leads:", error.message);
      return;
    }

    if (data) {
      const mappedLeads: Lead[] = await Promise.all(data.map(async (item: any) => {
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
          estimate: item.estimate || null
        };
      }));

      const normalLeads = mappedLeads.filter(l => !l.is_insurance_claim);
      const claims = mappedLeads.filter(l => l.is_insurance_claim);

      if (context !== dataContext.current) return;
      setLeads(normalLeads);
      setInsuranceClaims(claims);
    }
  };

  const fetchTeamMembers = async () => {
    if (!session || !profile) return;
    const context = dataContext.current;

    // Fetch all profiles from Supabase, including their organization details
    const { data, error } = await supabase
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
      `);

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
          activeLeads: Math.floor(Math.random() * 5),
          closeRate: 50 + Math.floor(Math.random() * 40)
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
    const refresh = () => { void fetchLeads(); void fetchTeamMembers(); };
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    const channel = supabase.channel(`company-members-${session.user.id}-${activeOrganization?.id || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void fetchTeamMembers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_organizations' }, () => void fetchTeamMembers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => void fetchLeads()).subscribe();
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, [session?.user.id, profile?.id, activeOrganization?.id, userRole, accountError]);

  // Filtered lists (fallback logic for local rendering)
  const filteredInsuranceClaims = insuranceClaims;
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

  const handleAddTeamMember = async (newMember: Omit<TeamMember, "id" | "avatar" | "status">) => {
    if (!session || !canManageTeam) throw new Error('No tienes permisos para invitar usuarios.');
    const dbRole = newMember.roleCategory === 'admin' ? 'super_admin' : newMember.roleCategory === 'staff'
      ? 'platform_staff' : newMember.roleCategory === 'contractor' ? 'owner' : 'employee';
    const organizationId = ['super_admin', 'platform_staff'].includes(dbRole) ? null
      : userRole === 'contractor' ? activeOrganization?.id : newMember.organizationId;
    const { error } = await supabase.rpc('save_xapcon_invitation', {
      p_email: newMember.email?.trim().toLowerCase(), p_full_name: newMember.name.trim(), p_role: dbRole,
      p_organization_id: organizationId || null, p_job_title: newMember.role,
      p_company_details: { phone: newMember.phone, companyEmail: newMember.companyEmail, companyWebsite: newMember.companyWebsite,
        registrationNumber: newMember.registrationNumber, licenseNumber: newMember.licenseNumber }
    });
    if (error) throw new Error(error.message);
    const { error: inviteError } = await supabase.auth.signInWithOtp({
      email: newMember.email!.trim(), options: { shouldCreateUser: true, emailRedirectTo: window.location.origin }
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
    if (!session) return;

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
      alert("Error al guardar en Supabase: " + error.message);
      return;
    }

    if (data) {
      await fetchLeads();
    }
  };

  // Actions: Insurance Claims View
  const handleSelectInsuranceClaim = (claimId: string) => {
    setSelectedInsuranceClaimId(claimId);
  };

  const handleNavigateToInsuranceClaim = (claimId: string) => {
    setSelectedInsuranceClaimId(claimId);
    setCurrentView(ViewType.INSURANCE_CLAIM);
  };

  const handleAddInsuranceClaimTimelineEvent = async (claimId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => {
    const { data, error } = await supabase.rpc('add_xapcon_timeline_event', { p_lead_id: claimId, p_event: event });
    if (error) throw new Error(error.message);
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
    details?: { dueDate?: string; priority?: 'high' | 'medium' | 'low'; kind?: 'task' | 'inspection' | 'adjuster_meeting' | 'installation'; category?: TaskItem['category']; scheduledTime?: string }
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
    if (data.is_insurance_claim) handleNavigateToInsuranceClaim(data.id);
    else if (userRole === "contractor") setCurrentView(ViewType.CLAIMS);
    else setCurrentView(ViewType.DASHBOARD);
  };

  const handleAddInsuranceClaim = async (newClaimData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    if (!session) return;

    let targetOrgId = newClaimData.organizationId || null;
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
      alert("Error al guardar en Supabase: " + error.message);
      return;
    }

    if (data) {
      await fetchLeads();
      setSelectedInsuranceClaimId(data.id);
    }
  };

  // Actions: Document Management
  const handleUploadDocuments = async (leadId: string, files: File[], category: string = "Reporte") => {
    if (!session) return false;

    const targetLead = leads.find(l => l.id === leadId) || insuranceClaims.find(c => c.id === leadId);
    if (!targetLead) return false;

    const newDocs: any[] = [];

    for (const file of files) {
      // Preserve original name using a subfolder with timestamp and short random suffix to prevent collisions
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      const filePath = `${leadId}/${Date.now()}_${randomSuffix}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        alert(`Error al subir archivo "${file.name}": ` + uploadError.message);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);

      newDocs.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: `${sizeInMB} MB`,
        category: category as any,
        url: publicUrl,
        filePath: filePath
      });
    }

    if (newDocs.length === 0) return false;

    const updatedDocs = [...newDocs, ...targetLead.documents];

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, documents: updatedDocs } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, documents: updatedDocs } : l));

    const { error: dbError } = await supabase.from('leads').update({ documents: updatedDocs }).eq('id', leadId);
    if (dbError) {
      alert("Error al guardar cambios en base de datos: " + dbError.message);
      return false;
    }
    return true;
  };

  const handleDeleteDocument = async (leadId: string, docId: string, filePath?: string) => {
    if (!session) return false;

    if (filePath) {
      const { error } = await supabase.storage.from('documents').remove([filePath]);
      if (error) {
        alert("Error al eliminar de Storage: " + error.message);
        return false;
      }
    }

    const targetLead = leads.find(l => l.id === leadId) || insuranceClaims.find(c => c.id === leadId);
    if (!targetLead) return false;

    const updatedDocs = targetLead.documents.filter(d => d.id !== docId);

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, documents: updatedDocs } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, documents: updatedDocs } : l));

    await supabase.from('leads').update({ documents: updatedDocs }).eq('id', leadId);
    return true;
  };

  const handleUploadImageForTimeline = async (file: File) => {
    if (!session) return null;
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `timeline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `timeline_images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
    return publicUrl;
  };



  // Actions: Claims Estimator View (Persisted in Supabase Leads)
  const handleUpdateLeadEstimate = async (leadId: string, updatedEstimate: Estimate) => {
    const { error } = await supabase
      .from('leads')
      .update({ estimate: updatedEstimate })
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
      }
    }
  };
  if (passwordRecovery && session) return <PasswordRecoveryView onComplete={finishPasswordRecovery} />;
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#17314A] text-white">Cargando plataforma...</div>;
  }

  if (!session) {
    return <LoginView />;
  }

  if (accountError || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F8] p-6">
      <div className="max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#17314A]">No se pudo preparar tu cuenta</h1>
        <p role="alert" className="my-4 text-sm text-slate-600">{accountError || 'No se encontró tu perfil.'}</p>
        <div className="flex gap-3"><button onClick={retryAccount} className="rounded-lg bg-[#17314A] px-4 py-2 text-white">Reintentar</button>
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F5F7F8] text-[#191c1e] font-sans antialiased overflow-hidden">

      {/* Sidebar - Desktop */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setMobileMenuOpen(false);
          setSelectedInsuranceClaimId("");
          setSearchTerm("");
        }}
        onLogout={signOut}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Header - Mobile */}
      <header className="no-print md:hidden flex items-center justify-between px-6 py-4 bg-[#17314A] text-white border-b border-white/15 shrink-0 select-none">
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
      </header>

      {/* Mobile Drawer Navigation links */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-[#17314A] z-50 p-6 flex flex-col space-y-3 animate-fade-in select-none">
          {[
            { id: ViewType.DASHBOARD, label: "Dashboard" },
            { id: ViewType.INSURANCE_CLAIM, label: "Insurance Claim" },
            ...(userRole === "contractor" ? [{ id: ViewType.CLAIMS, label: "Retail Estimator" }] : []),
            { id: ViewType.PRODUCTION, label: "Production Pipeline" },
            ...(userRole === "admin" ? [
              { id: ViewType.INSURANCE_DIRECTORY, label: "Directorio Aseguradoras" },
            ] : []),
            { id: ViewType.TEAM, label: "Personal & Crews" },
            { id: ViewType.SETTINGS, label: "Configuración" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentView === item.id
                  ? "bg-[#B77A4B] text-[#17314A] font-bold"
                  : "text-[#7c839b] hover:text-white hover:bg-white/5"
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
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "md:ml-[76px]" : "md:ml-[280px]"}`}>

        {/* Visual Top Bar for Company Selection */}
        {userRole === "admin" && (
          <div className="crm-topbar no-print bg-white border-b border-[#D8E0E6]/30 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 select-none shadow-sm">
            {/* Left: Admin Welcome + Live Clock & Company Filter */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold text-[#1e293b] tracking-wide">
                  Bienvenido, {profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || "Usuario"}
                </span>
                <LiveDateTime />
              </div>

              <div className="h-7 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa:</span>
                <select
                  value={activeOrganization?.id || "Todas"}
                  onChange={(e) => handleSetCompanyFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 text-xs font-bold text-[#17314A] focus:outline-none focus:ring-1 focus:ring-[#B77A4B] cursor-pointer shadow-sm"
                >
                  <option value="Todas">Todas las Empresas (Vista Consolidada)</option>
                  {organizations.map(org => (
                     <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-auto relative px-4 w-full">
              <input
                type="text"
                placeholder="Buscar homeowner, claim o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-xl text-xs text-[#17314A] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#B77A4B] focus:border-[#B77A4B] shadow-sm transition-all"
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
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-[#E2E4EA] rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-[#D8E0E6]/20">
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
                            <span className="text-xs font-bold text-[#17314A] group-hover:text-[#B77A4B] transition-colors truncate">
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
                          <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#B8860B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <NotificationBell userId={session.user.id} organizationId={activeOrganization?.id} onNotificationClick={handleNotificationClick} />
              </div>
            </div>
          </div>
        )}

        {userRole === "contractor" && (
          <div className="crm-topbar contractor-topbar no-print bg-white border-b border-[#D8E0E6]/30 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 select-none shadow-sm">
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
                className="w-full pl-9 pr-8 py-1.5 bg-[#F5F7F8] border border-[#D8E0E6]/60 rounded-xl text-xs text-[#17314A] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#B77A4B] focus:border-[#B77A4B] shadow-sm transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
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
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-[#E2E4EA] rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-[#D8E0E6]/20">
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
                            <span className="text-xs font-bold text-[#17314A] group-hover:text-[#B77A4B] transition-colors truncate">
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
                          <svg className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#B8860B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">

              {organizations.length > 1 && <label className="text-xs font-semibold text-[#17314A]">Empresa
                <select aria-label="Cambiar empresa" value={activeOrganization?.id || ''} onChange={e => {
                  const org = organizations.find(o => o.id === e.target.value); if (org) { setActiveOrganization(org); setSelectedInsuranceClaimId(''); }
                }} className="ml-2 rounded-lg border bg-white p-2">
                  {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </label>}
              <div className="border-l border-gray-200 pl-4">
                <NotificationBell userId={session.user.id} organizationId={activeOrganization?.id} onNotificationClick={handleNotificationClick} />
              </div>
            </div>
          </div>
        )}

        {/* View selections viewport */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-500">Cargando sección…</div>}>
          {currentView === ViewType.DASHBOARD && (
            userRole === "contractor" ? (
              <ContractorDashboard
                claims={filteredInsuranceClaims}
                teamMembers={teamMembers}
                currentUserId={session.user.id}
                defaultTaskScope={canManageTeam ? "all" : "mine"}
                onNavigateToView={setCurrentView}
                onNavigateToLead={handleNavigateToInsuranceClaim}
                onCreateClaim={() => {
                  setSelectedInsuranceClaimId("");
                  setOpenClaimFormOnEnter(true);
                  setCurrentView(ViewType.INSURANCE_CLAIM);
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
                onNavigateToView={setCurrentView}
                onNavigateToLead={handleNavigateToInsuranceClaim}
                claims={filteredInsuranceClaims}
                onToggleTask={handleToggleInsuranceClaimTask}
                taskComposer={<ContractorDashboard composerOnly claims={filteredInsuranceClaims} teamMembers={teamMembers}
                  currentUserId={session.user.id} onNavigateToView={setCurrentView} onNavigateToLead={handleNavigateToInsuranceClaim}
                  onCreateClaim={() => setCurrentView(ViewType.INSURANCE_CLAIM)} onToggleTask={handleToggleInsuranceClaimTask} onAddTask={handleAddTask} />}
              />
            )
          )}


          {currentView === ViewType.INSURANCE_CLAIM && (
            <ErrorBoundary>
              <LeadsView
                leads={filteredInsuranceClaims}
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
              />
            </ErrorBoundary>
          )}

          {currentView === ViewType.CLAIMS && userRole === "contractor" && (
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

          {currentView === ViewType.INSURANCE_DIRECTORY && userRole === "admin" && (
            <InsuranceDirectoryView
              claims={[...leads, ...insuranceClaims]}
              onNavigateToClaim={handleNavigateToInsuranceClaim}
              onInsuranceRegistered={() => setInsuranceRefreshKey(k => k + 1)}
            />
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
  );
}
