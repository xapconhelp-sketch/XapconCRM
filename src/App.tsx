import React, { useState, useEffect } from "react";
import logo from "../LogoNegativo-copia.png";
import { ViewType, Lead, Estimate, EstimateItem, KanbanProject, Invoice, TeamMember, CriticalAlert, InspectionAppointment, TimelineEvent, TaskItem } from "./types";
import { 
  initialLeads, 
  initialEstimate, 
  initialProjects, 
  initialInvoices, 
  initialTeamMembers, 
  initialCriticalAlerts, 
  initialInspections 
} from "./data";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";

import Sidebar from "./components/Sidebar";
import MainDashboard from "./components/MainDashboard";
import LeadsView from "./components/LeadsView";
import EstimatorView from "./components/EstimatorView";
import ProductionView from "./components/ProductionView";
import FinancialsView from "./components/FinancialsView";
import TeamView from "./components/TeamView";
import LoginView from "./components/LoginView";
import { NotificationBell } from "./components/NotificationBell";
import { notificationService } from "./services/notificationService";

import { Menu, X, HelpCircle } from "lucide-react";

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

export default function App() {
  const { session, profile, activeOrganization, organizations, setActiveOrganization, signOut, loading } = useAuth();

  // Mapear los roles de Supabase al estado de la vista
  // SOLO el super_admin (Xapcon Group) ve el panel de administración
  const userRole = profile?.role === 'super_admin' ? 'admin' : 'contractor';
  const contractorCompany = activeOrganization?.name || "Desconocida";
  const selectedCompanyFilter = activeOrganization?.name || "Todas";

  const handleSetCompanyFilter = (val: string) => {
    if (val === "Todas") {
      setActiveOrganization(null);
      window.history.pushState({}, '', '/admin/dashboard');
    } else {
      const org = organizations.find(o => o.name === val) || null;
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
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const saved = localStorage.getItem("crm_current_view");
    return (saved as ViewType) || ViewType.DASHBOARD;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Core CRM States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(() => {
    return localStorage.getItem("crm_selected_lead_id") || "";
  });
  const [insuranceClaims, setInsuranceClaims] = useState<Lead[]>([]);
  const [selectedInsuranceClaimId, setSelectedInsuranceClaimId] = useState<string>(() => {
    return localStorage.getItem("crm_selected_claim_id") || "";
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    localStorage.setItem("crm_current_view", currentView);
  }, [currentView]);

  const [estimate, setEstimate] = useState<Estimate | null>(initialEstimate);

  useEffect(() => {
    localStorage.setItem("crm_selected_lead_id", selectedLeadId);
  }, [selectedLeadId]);

  useEffect(() => {
    localStorage.setItem("crm_selected_claim_id", selectedInsuranceClaimId);
  }, [selectedInsuranceClaimId]);

  const [projects, setProjects] = useState<KanbanProject[]>(initialProjects);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>(initialCriticalAlerts);
  const [inspections, setInspections] = useState<InspectionAppointment[]>(initialInspections);
  const [teamFetchError, setTeamFetchError] = useState<string>("");

  // Carga asíncrona de datos desde Supabase
  const fetchLeads = async () => {
    if (!session) return;
    
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
        const selectedOrg = organizations.find(o => o.name === selectedCompanyFilter);
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
        const rawTasks = item.tasks || [];
        const uniqueTasks: any[] = [];
        const seen = new Set<string>();
        for (const t of rawTasks) {
          const normalizedTitle = t.title ? t.title.trim().toLowerCase() : "";
          
          // Skip the auto-generated default tasks based on user request
          if (normalizedTitle === "inspección de daños" || normalizedTitle === "inspección del ajustador") {
            continue;
          }

          if (!seen.has(normalizedTitle)) {
            seen.add(normalizedTitle);
            uniqueTasks.push(t);
          }
        }
        
        // Auto-heal the database if duplicates were found or default tasks were removed
        if (uniqueTasks.length < rawTasks.length) {
          console.log(`Auto-healing tasks for case ${item.name}`);
          supabase.from('leads').update({ tasks: uniqueTasks }).eq('id', item.id).then();
        }

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
          sqft: item.sqft || 2000,
          insuranceProvider: item.insurance_provider || "State Farm",
          claimNumber: item.claim_number || "Por reclamar",
          policyNumber: item.policy_number || "",
          damageType: item.damage_type || "",
          lossDate: item.loss_date || "",
          insurancePhone1: item.insurance_phone1 || "",
          insurancePhone2: item.insurance_phone2 || "",
          insuranceEmail1: item.insurance_email1 || "",
          insuranceEmail2: item.insurance_email2 || "",
          notes: item.notes || "",
          adjusterName: item.adjuster_name || "Por asignar",
          assignedRep: item.assigned_rep || "Michael Chen",
          assignedRepAvatar: item.assigned_rep_avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC",
          createdAt: new Date(item.created_at).toLocaleDateString(),
          created_at: item.created_at,
          timeline: item.timeline || [],
          documents: item.documents || [],
          tasks: uniqueTasks,
          company: item.organizations?.name || "Desconocida",
          organizationId: item.organization_id,
          is_insurance_claim: item.is_insurance_claim,
          estimate: item.estimate || null
        };
      }));

      const normalLeads = mappedLeads.filter(l => !l.is_insurance_claim);
      const claims = mappedLeads.filter(l => l.is_insurance_claim);

      setLeads(normalLeads);
      setInsuranceClaims(claims);
    }
  };

  const fetchTeamMembers = async () => {
    if (!session) return;

    // Fetch all profiles from Supabase, including their organization details
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
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
      setTeamFetchError(error.message);
      return;
    }

    if (data) {
      if (data.length === 0) {
        setTeamFetchError("SUCCESS, BUT 0 ROWS RETURNED FROM PROFILES TABLE.");
      } else {
        setTeamFetchError(`SUCCESS, ${data.length} ROWS RETURNED.`);
      }
      
      try {
        const mappedMembers: TeamMember[] = data.map((item: any) => {
          const orgData = item.user_organizations?.[0]?.organizations;
          const orgName = orgData?.name || "Xapcon Group";
          const inviteCode = orgData?.invite_code || "";
        
        // Map roles to readable client terms
        let roleText = item.role || "Colaborador";
        let roleCat: "sales" | "pm" | "install" | "admin" | "contractor" = "pm";
        
        if (item.role === 'super_admin') {
          roleText = "Dueño de Xapcon Group";
          roleCat = "admin";
        } else if (item.role === 'owner' || item.role === 'Dueño') {
          roleText = `Dueño de ${orgName}`;
          roleCat = "contractor";
        } else if (item.role === 'contractor' || item.role === 'Contratista') {
          roleText = `Contratista de ${orgName}`;
          roleCat = "contractor";
        } else if (item.role === 'Vendedor' || item.role === 'Gerente de Ventas') {
          roleCat = "sales";
        } else if (item.role === 'employee' || item.role === 'Colaborador') {
          roleText = `Colaborador de ${orgName}`;
          roleCat = "pm"; 
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

        // Contractor role sees only members of their own company/org PLUS admins
        if (userRole === "contractor") {
          const filtered = mappedMembers.filter(m => 
            m.company === contractorCompany || 
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
        setTeamFetchError(`MAPPING ERROR: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchTeamMembers();
  }, [session, activeOrganization, selectedCompanyFilter, userRole, organizations]);

  // Filtered lists (fallback logic for local rendering)
  const filteredLeads = leads;
  const filteredInsuranceClaims = insuranceClaims;
  const filteredProjects = projects.filter((p) => 
    selectedCompanyFilter === "Todas" || p.company === selectedCompanyFilter
  );
  const filteredInvoices = invoices.filter((inv) => 
    selectedCompanyFilter === "Todas" || inv.company === selectedCompanyFilter
  );

  const activeLeadId = selectedLeadId === "" 
    ? "" 
    : (filteredLeads.some(l => l.id === selectedLeadId) ? selectedLeadId : "");

  const activeInsuranceClaimId = selectedInsuranceClaimId === ""
    ? ""
    : (filteredInsuranceClaims.some(c => c.id === selectedInsuranceClaimId) ? selectedInsuranceClaimId : "");

  // Selected Lead helper
  const activeLead = filteredLeads.find((l) => l.id === activeLeadId) || filteredLeads[0];

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

  const handleAddTeamMember = async (newMember: Omit<TeamMember, "id" | "avatar" | "status">) => {
    if (!session) return;

    let dbRole = "contractor";
    if (newMember.roleCategory === "admin") {
      dbRole = "super_admin";
    } else if (newMember.roleCategory === "contractor") {
      dbRole = "owner";
    } else {
      dbRole = "employee";
    }

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: newMember.email,
      password: "TemporaryPassword123!",
      options: {
        data: {
          full_name: newMember.name,
          role: dbRole
        }
      }
    });

    if (signUpErr) {
      console.error("Error al registrar miembro:", signUpErr.message);
      alert("Error al registrar miembro: " + signUpErr.message);
      return;
    }

    if (signUpData?.user) {
      // Find Organization ID by name
      let orgId = null;
      if (newMember.company) {
        const org = organizations.find(o => o.name === newMember.company);
        orgId = org?.id || null;
      }

      if (orgId) {
        const { error: relErr } = await supabase
          .from("user_organizations")
          .insert({
            user_id: signUpData.user.id,
            organization_id: orgId
          });

        if (relErr) {
          console.error("Error al vincular organización:", relErr.message);
        }
      }

      // Save contractor company metadata in profiles table
      if (newMember.roleCategory === "contractor") {
        const { error: profileUpdateErr } = await supabase
          .from("profiles")
          .update({
            company_email: newMember.companyEmail || null,
            company_website: newMember.companyWebsite || null,
            registration_number: newMember.registrationNumber || null,
            license_number: newMember.licenseNumber || null
          })
          .eq("id", signUpData.user.id);
          
        if (profileUpdateErr) {
          console.error("Error updating profile metadata:", profileUpdateErr.message);
        }
      }

      alert(`¡Usuario registrado con éxito! Contraseña temporal para el acceso: TemporaryPassword123!`);
      await fetchTeamMembers();
    }
  };

  // Helper: Estimate recalculator
  const recalculateEstimate = (items: EstimateItem[]): Estimate => {
    let subMaterials = 0;
    let subLabor = 0;
    let subFees = 350; // default permits & fees pass-through

    items.forEach((item) => {
      item.total = item.qty * item.unitPrice;
      if (item.category === "material") {
        subMaterials += item.total;
      } else if (item.category === "labor") {
        subLabor += item.total;
      } else {
        subFees += item.total;
      }
    });

    const subGross = subMaterials + subLabor + subFees;
    const taxAmount = Math.round(subGross * 0.0825 * 100) / 100;
    const total = Math.round((subGross + taxAmount) * 100) / 100;

    // Calculate realistic cost based on materials and crew labor costs
    let totalCost = 0;
    items.forEach((item) => {
      let costFactor = 0.6; // standard default cost factor (40% profit margin default)
      if (item.description.includes("Shingle") || item.description.includes("Teja")) {
        costFactor = 80 / 120; // shingles cost 80, sell 120 (33% margin)
      } else if (item.description.includes("Underlayment") || item.description.includes("Membrana")) {
        costFactor = 50 / 85; // underlayment cost 50, sell 85 (41% margin)
      } else if (item.description.includes("Ridge") || item.description.includes("Venting")) {
        costFactor = 8 / 12.5; // venting cost 8, sell 12.5 (36% margin)
      } else if (item.description.includes("Labor") || item.description.includes("Mano")) {
        costFactor = 60 / 95; // crew costs 60/SQ, sold at 95 (36.8% margin)
      } else if (item.category === "fee") {
        costFactor = 1.0; // fees are pass-through
      }
      totalCost += item.qty * (item.unitPrice * costFactor);
    });

    const profit = subGross - totalCost;
    const profitMargin = subGross > 0 ? Math.round((profit / subGross) * 100 * 10) / 10 : 0;

    return {
      id: estimate?.id || "EST-2409-A",
      leadId: estimate?.leadId || "APX-9824",
      clientName: estimate?.clientName ?? "James Robertson",
      address: estimate?.address ?? "1244 Maplewood Dr, Austin, TX 78704",
      clientPhone: estimate?.clientPhone ?? "",
      clientEmail: estimate?.clientEmail ?? "",
      status: estimate?.status || "Draft",
      items,
      subtotalMaterials: subMaterials,
      subtotalLabor: subLabor,
      subtotalFees: subFees,
      subtotalGross: subGross,
      taxRate: 0.0825,
      taxAmount,
      total,
      profitMargin
    };
  };

  // Actions: Leads View
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleAddTimelineEvent = async (leadId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => {
    if (event.type === "note") {
      const currentUserName = profile?.full_name || session?.user?.email?.split('@')[0] || "Usuario";
      let currentUserRole = "Colaborador";
      if (profile?.role === 'super_admin') currentUserRole = "G. Xapcon Group";
      else if (profile?.role === 'owner' || profile?.role === 'Dueño') currentUserRole = "Dueño";
      else if (profile?.role === 'contractor' || profile?.role === 'Contratista') currentUserRole = "Contratista";
      else if (profile?.role === 'Vendedor' || profile?.role === 'Gerente de Ventas') currentUserRole = "Vendedor";

      event.author = currentUserName;
      event.title = `${currentUserName} (${currentUserRole})`;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString()} a las ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    const newEvent: TimelineEvent = {
      ...event,
      id: `timeline-${Date.now()}`,
      timestamp: formattedDate,
      date: now.toISOString()
    };

    // ALWAYS fetch current timeline from DB to avoid stale closure
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('timeline').eq('id', leadId).single();
    if (fetchErr || !dbRow) {
      console.error("Error fetching timeline:", fetchErr?.message);
      return;
    }
    
    const currentTimeline: TimelineEvent[] = dbRow.timeline || [];
    const updatedTimeline = [newEvent, ...currentTimeline];

    const { error } = await supabase.from('leads').update({ timeline: updatedTimeline }).eq('id', leadId);
    if (error) {
      console.error("Error saving timeline:", error.message);
      return;
    }

    // Update both state lists since we don't know which one holds this ID
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, timeline: updatedTimeline } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, timeline: updatedTimeline } : l));

    // Detección de Menciones
    if (event.type === "note" && event.content) {
      const mentionedUsers = teamMembers.filter((member) => {
        const firstName = member.name ? member.name.split(" ")[0] : "";
        return firstName && event.content!.includes(`@${firstName}`);
      });
      for (const userToNotify of mentionedUsers) {
        notificationService.trigger(
          "mention",
          leadId,
          "lead",
          {
            author_name: event.author,
            content: event.content,
            recipient_name: userToNotify.name
          },
          userToNotify.id,
          userToNotify.organizationId
        );
      }
    }
  };

  const handleDeleteTimelineEvent = async (leadId: string, eventId: string) => {
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('timeline').eq('id', leadId).single();
    if (fetchErr || !dbRow) return;

    const currentTimeline: TimelineEvent[] = dbRow.timeline || [];
    const updatedTimeline = currentTimeline.filter(e => e.id !== eventId);

    const { error } = await supabase.from('leads').update({ timeline: updatedTimeline }).eq('id', leadId);
    if (error) {
      console.error("Error deleting timeline event:", error.message);
      return;
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, timeline: updatedTimeline } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, timeline: updatedTimeline } : l));
  };

  const handleToggleTask = async (leadId: string, taskId: string) => {
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('tasks').eq('id', leadId).single();
    if (fetchErr || !dbRow) return;

    const currentTasks: TaskItem[] = dbRow.tasks || [];
    const updatedTasks = currentTasks.map((t) => 
      (t.id === taskId ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t)
    );

    await supabase.from('leads').update({ tasks: updatedTasks }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: updatedTasks } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, tasks: updatedTasks } : l));
  };

  const handleAddLead = async (newLeadData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    if (!session) return;

    let targetOrgId = newLeadData.organizationId || null;
    if (!targetOrgId) {
      if (userRole === "contractor") {
        targetOrgId = activeOrganization?.id;
      } else {
        const currentOrg = organizations.find(o => o.name === selectedCompanyFilter);
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
      setSelectedLeadId(data.id);
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
    if (event.type === "note") {
      const currentUserName = profile?.full_name || session?.user?.email?.split('@')[0] || "Usuario";
      let currentUserRole = "Colaborador";
      if (profile?.role === 'super_admin') currentUserRole = "G. Xapcon Group";
      else if (profile?.role === 'owner' || profile?.role === 'Dueño') currentUserRole = "Dueño";
      else if (profile?.role === 'contractor' || profile?.role === 'Contratista') currentUserRole = "Contratista";
      else if (profile?.role === 'Vendedor' || profile?.role === 'Gerente de Ventas') currentUserRole = "Vendedor";

      event.author = currentUserName;
      event.title = `${currentUserName} (${currentUserRole})`;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString()} a las ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    const newEvent: TimelineEvent = {
      ...event,
      id: `timeline-${Date.now()}`,
      timestamp: formattedDate,
      date: now.toISOString()
    };

    // ALWAYS fetch current timeline from DB to avoid stale closure
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('timeline').eq('id', claimId).single();
    if (fetchErr || !dbRow) {
      console.error("Error fetching claim timeline:", fetchErr?.message);
      return;
    }
    
    const currentTimeline: TimelineEvent[] = dbRow.timeline || [];
    const updatedTimeline = [newEvent, ...currentTimeline];

    const { error } = await supabase.from('leads').update({ timeline: updatedTimeline }).eq('id', claimId);
    if (error) {
      console.error("Error saving claim timeline:", error.message);
      return;
    }

    // Update both state lists
    setInsuranceClaims(prev => prev.map(l => l.id === claimId ? { ...l, timeline: updatedTimeline } : l));
    setLeads(prev => prev.map(l => l.id === claimId ? { ...l, timeline: updatedTimeline } : l));

    // Detección de Menciones
    if (event.type === "note" && event.content) {
      const mentionedUsers = teamMembers.filter((member) => {
        const firstName = member.name ? member.name.split(" ")[0] : "";
        return firstName && event.content!.includes(`@${firstName}`);
      });
      for (const userToNotify of mentionedUsers) {
        notificationService.trigger(
          "mention",
          claimId,
          "lead",
          {
            author_name: event.author,
            content: event.content,
            recipient_name: userToNotify.name
          },
          userToNotify.id,
          userToNotify.organizationId
        );
      }
    }
  };

  const handleToggleInsuranceClaimTask = async (claimId: string, taskId: string) => {
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('tasks, name').eq('id', claimId).single();
    if (fetchErr || !dbRow) return;

    const currentTasks: TaskItem[] = dbRow.tasks || [];
    const targetTask = currentTasks.find(t => t.id === taskId);

    const updatedTasks = currentTasks.map((t) => 
      (t.id === taskId ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t)
    );

    await supabase.from('leads').update({ tasks: updatedTasks }).eq('id', claimId);
    setLeads(prev => prev.map(l => l.id === claimId ? { ...l, tasks: updatedTasks } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === claimId ? { ...l, tasks: updatedTasks } : l));

    // Notify the task creator/tagger when transitioning to completed
    if (targetTask && targetTask.status === "pending") {
      const creatorId = targetTask.createdById;
      if (creatorId && creatorId !== session?.user?.id) {
        try {
          await notificationService.trigger(
            "mention",
            claimId,
            "lead",
            {
              author_name: profile?.full_name || session?.user?.email || "Un colaborador",
              content: `Completó la tarea: "${targetTask.title}" en el caso ${dbRow.name}`
            },
            creatorId,
            activeOrganization?.id || undefined
          );
        } catch (err) {
          console.error("Error triggering completion notification:", err);
        }
      }
    }
  };

  const handleAddTask = async (leadId: string, taskTitle: string, assignedTo?: string) => {
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('tasks').eq('id', leadId).single();
    if (fetchErr || !dbRow) return;

    const currentTasks: TaskItem[] = dbRow.tasks || [];
    
    // Prevent duplicate tasks with the exact same title
    const normalizedTitle = taskTitle.trim().toLowerCase();
    if (currentTasks.some(t => t.title && t.title.trim().toLowerCase() === normalizedTitle)) {
      console.warn("Task with this title already exists.");
      return;
    }

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: taskTitle,
      status: "pending",
      dueDate: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
      assignedTo,
      createdById: session?.user?.id,
      createdBy: profile?.full_name || session?.user?.email || "Usuario"
    };
    const updatedTasks = [...currentTasks, newTask];

    await supabase.from('leads').update({ tasks: updatedTasks }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: updatedTasks } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, tasks: updatedTasks } : l));
  };

  const handleDeleteTask = async (leadId: string, taskId: string) => {
    const { data: dbRow, error: fetchErr } = await supabase.from('leads').select('tasks').eq('id', leadId).single();
    if (fetchErr || !dbRow) return;

    const currentTasks: TaskItem[] = dbRow.tasks || [];
    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);

    await supabase.from('leads').update({ tasks: updatedTasks }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: updatedTasks } : l));
    setInsuranceClaims(prev => prev.map(l => l.id === leadId ? { ...l, tasks: updatedTasks } : l));
  };

  const handleAddInsuranceClaim = async (newClaimData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    if (!session) return;

    let targetOrgId = newClaimData.organizationId || null;
    if (!targetOrgId) {
      if (userRole === "contractor") {
        targetOrgId = activeOrganization?.id;
      } else {
        const currentOrg = organizations.find(o => o.name === selectedCompanyFilter);
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
    
    if (selectedLeadId === leadId) setSelectedLeadId("");
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
      alert("Error al guardar cambios: " + error.message);
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
      currentIdx = 0; // Fallback to first column
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
  // Action: Dashboard Resolutions
  const handleResolveAlert = (alert: CriticalAlert) => {
    setCriticalAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    if (alert.targetId) {
      if (alert.targetId.startsWith("APX")) {
        setCurrentView(ViewType.CLAIMS);
        setSelectedLeadId(alert.targetId);
      } else {
        setCurrentView(ViewType.PRODUCTION);
      }
    }
  };

  // Quick action CTA sidebar "Nuevo Proyecto"
  const handleNewEstimateCTA = () => {
    setCurrentView(ViewType.CLAIMS);
    setEstimate({
      ...initialEstimate,
      status: "Draft",
      profitMargin: 24.5
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#131b2e] text-white">Cargando plataforma...</div>;
  }

  if (!session) {
    return <LoginView />;
  }

  const pipelineStatuses = [
    "Negados",
    "Inspección",
    "En disputa",
    "Esperando Scope",
    "Aprobado",
    "Aprobado y Suplementado",
    "Construcción",
    "Esperando Depreciación",
    "Finalizado",
    "Cancelado"
  ];

  const negadosCount = filteredInsuranceClaims.filter(c => c.status === 'Negados').length;
  const inspeccionCount = filteredInsuranceClaims.filter(c => c.status === 'Inspección' || !pipelineStatuses.includes(c.status)).length;
  const enDisputaCount = filteredInsuranceClaims.filter(c => c.status === 'En disputa').length;
  const esperandoScopeCount = filteredInsuranceClaims.filter(c => c.status === 'Esperando Scope').length;
  const aprobadoSuplementadoCount = filteredInsuranceClaims.filter(c => c.status === 'Aprobado y Suplementado').length;
  const esperandoDepreciacionCount = filteredInsuranceClaims.filter(c => c.status === 'Esperando Depreciación').length;
  const finalizadoCount = filteredInsuranceClaims.filter(c => c.status === 'Finalizado').length;
  const canceladoCount = filteredInsuranceClaims.filter(c => c.status === 'Cancelado').length;

  // Custom KPI logic:
  // "el valor de 'casos activos' es la suma de todos los casos, menos los finalizados, menos los negados."
  const casosActivosCount = filteredInsuranceClaims.length - finalizadoCount - negadosCount;
  // "los casos 'Construidos' debe siempre ser igual al valor de los casos finalizados, mas los de esperando depreciación."
  const construidosCount = finalizadoCount + esperandoDepreciacionCount;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f7f9fb] text-[#191c1e] font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => {
          setCurrentView(view);
          setMobileMenuOpen(false);
          setSelectedLeadId("");
          setSelectedInsuranceClaimId("");
          setSearchTerm("");
        }}
        onLogout={signOut}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Header - Mobile */}
      <header className="no-print md:hidden flex items-center justify-between px-6 py-4 bg-[#131b2e] text-white border-b border-white/15 shrink-0 select-none">
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
        <div className="md:hidden fixed inset-0 top-[65px] bg-[#131b2e] z-50 p-6 flex flex-col space-y-3 animate-fade-in select-none">
          {[
            { id: ViewType.DASHBOARD, label: "Dashboard" },
            { id: ViewType.INSURANCE_CLAIM, label: "Insurance Claim" },
            { id: ViewType.CLAIMS, label: "Retail Estimator" },
            { id: ViewType.PRODUCTION, label: "Production Pipeline" },
            ...(userRole === "admin" ? [
              { id: ViewType.FINANCIALS, label: "Financials Overview" },
            ] : []),
            { id: ViewType.TEAM, label: "Personal & Crews" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                currentView === item.id 
                  ? "bg-[#eab308] text-[#131b2e] font-bold" 
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
          <div className="no-print bg-white border-b border-[#c6c6cd]/30 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Visualizando Empresa:</span>
              <select 
                value={selectedCompanyFilter}
                onChange={(e) => handleSetCompanyFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-lg py-1 px-3 text-xs font-bold text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#0ea5e9] cursor-pointer"
              >
                <option value="Todas">Todas las Empresas (Vista Consolidada)</option>
                {organizations.map(org => (
                   <option key={org.id} value={org.name}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-auto relative px-4 w-full">
              <input
                type="text"
                placeholder="Buscar homeowner, claim o dirección..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (val.trim() !== "") {
                    setCurrentView(ViewType.INSURANCE_CLAIM);
                    setSelectedInsuranceClaimId("");
                  }
                }}
                className="w-full pl-9 pr-8 py-1.5 bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-xl text-xs text-[#131b2e] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#eab308] focus:border-[#eab308] shadow-sm transition-all"
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
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-[#ca8a04]">
              <span className="w-2 h-2 rounded-full bg-[#eab308] animate-pulse"></span>
              <span>Modo Administrador (Xapcon Team)</span>
              <div className="ml-4 border-l border-gray-200 pl-4">
                <NotificationBell userId={session.user.id} organizationId={activeOrganization?.id} />
              </div>
            </div>
          </div>
        )}

        {userRole === "contractor" && (
          <div className="no-print bg-white border-b border-[#c6c6cd]/30 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Portal de Cliente:</span>
              <span className="px-2.5 py-1 bg-sky-50 text-sky-800 text-xs font-bold rounded-lg border border-sky-100 uppercase tracking-wider">
                🏢 {contractorCompany}
              </span>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-auto relative px-4 w-full">
              <input
                type="text"
                placeholder="Buscar homeowner, claim o dirección..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (val.trim() !== "") {
                    setCurrentView(ViewType.INSURANCE_CLAIM);
                    setSelectedInsuranceClaimId("");
                  }
                }}
                className="w-full pl-9 pr-8 py-1.5 bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-xl text-xs text-[#131b2e] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#eab308] focus:border-[#eab308] shadow-sm transition-all"
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
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-500">Acceso restringido a tu empresa</span>
              <div className="border-l border-gray-200 pl-4">
                <NotificationBell userId={session.user.id} organizationId={activeOrganization?.id} />
              </div>
            </div>
          </div>
        )}

        {/* View selections viewport */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {currentView === ViewType.DASHBOARD && (
            <MainDashboard
              kpis={[
                { title: "Casos Activos", value: `${casosActivosCount}`, trend: "", trendDirection: "up", subtitle: "Total bajo gestión", icon: "check-circle" },
                { title: "En disputa", value: `${enDisputaCount + esperandoScopeCount}`, trend: "", trendDirection: "up", subtitle: "Trámites con aseguradora", icon: "scale" },
                { title: "Construidos", value: `${construidosCount}`, trend: "", trendDirection: "up", subtitle: "Obras finalizadas y en curso", icon: "hard-hat" },
                { title: "Esp. Depreciación", value: `${esperandoDepreciacionCount}`, trend: "", trendDirection: "up", subtitle: "Falta recuperar fondos", icon: "clock" },
                { title: "Finalizados", value: `${finalizadoCount}`, trend: "", trendDirection: "up", subtitle: "Casos cerrados", icon: "flag" }
              ]}
              alerts={userRole === "admin" ? criticalAlerts : []}
              inspections={userRole === "admin" ? inspections : []}
              onResolveAlert={handleResolveAlert}
              onNavigateToView={setCurrentView}
              onNavigateToLead={handleNavigateToInsuranceClaim}
              claims={filteredInsuranceClaims}
              onToggleTask={handleToggleInsuranceClaimTask}
            />
          )}


          {currentView === ViewType.INSURANCE_CLAIM && (
            <ErrorBoundary>
              <LeadsView
                leads={filteredInsuranceClaims}
                selectedLeadId={activeInsuranceClaimId}
                onSelectLead={handleSelectInsuranceClaim}
                onAddTimelineEvent={handleAddInsuranceClaimTimelineEvent}
                onDeleteTimelineEvent={handleDeleteTimelineEvent}
                onToggleTask={handleToggleInsuranceClaimTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
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
                onNavigateToView={setCurrentView}
              />
            </ErrorBoundary>
          )}

          {currentView === ViewType.CLAIMS && (
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

          {currentView === ViewType.FINANCIALS && (
            <FinancialsView
              invoices={filteredInvoices}
              leads={[...leads, ...insuranceClaims]}
              onNavigateToLead={handleNavigateToInsuranceClaim}
            />
          )}

          {currentView === ViewType.TEAM && (
            <ErrorBoundary>
              <TeamView
                members={teamMembers}
                onAddMember={handleAddTeamMember}
                onUpdateMember={handleUpdateTeamMember}
                userRole={userRole}
                organizations={organizations}
                userCompany={contractorCompany}
                companyInviteCode={activeOrganization?.invite_code}
                currentUserId={session?.user?.id}
              />
            </ErrorBoundary>
          )}
        </div>

      </main>
    </div>
  );
}
