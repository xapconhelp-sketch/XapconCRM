import React, { useState } from "react";
import logo from "../LogoNegativo-copia.png";
import { ViewType, Lead, Estimate, EstimateItem, KanbanProject, Invoice, TeamMember, CriticalAlert, InspectionAppointment, TimelineEvent } from "./types";
import { 
  initialLeads, 
  initialEstimate, 
  initialProjects, 
  initialInvoices, 
  initialTeamMembers, 
  initialCriticalAlerts, 
  initialInspections 
} from "./data";

import Sidebar from "./components/Sidebar";
import MainDashboard from "./components/MainDashboard";
import LeadsView from "./components/LeadsView";
import EstimatorView from "./components/EstimatorView";
import ProductionView from "./components/ProductionView";
import FinancialsView from "./components/FinancialsView";
import TeamView from "./components/TeamView";
import LoginView from "./components/LoginView";

import { Menu, X, HelpCircle } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Views and collapsible menus
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core CRM States
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeads[0].id);
  const [insuranceClaims, setInsuranceClaims] = useState<Lead[]>(() => 
    initialLeads.map((l) => ({
      ...l,
      id: l.id.replace("APX", "CLM"),
      status: "Inspección Programada"
    }))
  );
  const [selectedInsuranceClaimId, setSelectedInsuranceClaimId] = useState<string>(
    initialLeads[0].id.replace("APX", "CLM")
  );
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate);
  const [projects, setProjects] = useState<KanbanProject[]>(initialProjects);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>(initialCriticalAlerts);
  const [inspections, setInspections] = useState<InspectionAppointment[]>(initialInspections);

  // Selected Lead helper
  const activeLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

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

  const handleAddTimelineEvent = (leadId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => {
    setLeads((prevLeads) =>
      prevLeads.map((l) => {
        if (l.id === leadId) {
          const newEvent: TimelineEvent = {
            ...event,
            id: `timeline-${Date.now()}`,
            timestamp: "Justo ahora"
          };
          return {
            ...l,
            timeline: [newEvent, ...l.timeline]
          };
        }
        return l;
      })
    );
  };

  const handleToggleTask = (leadId: string, taskId: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t))
          };
        }
        return l;
      })
    );
  };

  const handleAddLead = (newLeadData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    const newLeadId = `APX-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLead: Lead = {
      ...newLeadData,
      id: newLeadId,
      createdAt: "Hoy",
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
      documents: [],
      tasks: [
        { id: `tk-${Date.now()}-1`, title: "Calificar Lead por Teléfono", dueDate: "Hoy", status: "pending", priority: "high" },
        { id: `tk-${Date.now()}-2`, title: "Programar Inspección Inicial", dueDate: "Mañana", status: "pending", priority: "medium" }
      ]
    };

    setLeads((prev) => [newLead, ...prev]);
    setSelectedLeadId(newLeadId);
  };

  // Actions: Insurance Claims View
  const handleSelectInsuranceClaim = (claimId: string) => {
    setSelectedInsuranceClaimId(claimId);
  };

  const handleAddInsuranceClaimTimelineEvent = (claimId: string, event: Omit<TimelineEvent, "id" | "timestamp">) => {
    setInsuranceClaims((prevClaims) =>
      prevClaims.map((l) => {
        if (l.id === claimId) {
          const newEvent: TimelineEvent = {
            ...event,
            id: `timeline-${Date.now()}`,
            timestamp: "Justo ahora"
          };
          return {
            ...l,
            timeline: [newEvent, ...l.timeline]
          };
        }
        return l;
      })
    );
  };

  const handleToggleInsuranceClaimTask = (claimId: string, taskId: string) => {
    setInsuranceClaims((prevClaims) =>
      prevClaims.map((l) => {
        if (l.id === claimId) {
          return {
            ...l,
            tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t))
          };
        }
        return l;
      })
    );
  };

  const handleAddInsuranceClaim = (newClaimData: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => {
    const newClaimId = `CLM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClaim: Lead = {
      ...newClaimData,
      id: newClaimId,
      createdAt: "Hoy",
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
      documents: [],
      tasks: [
        { id: `tk-${Date.now()}-1`, title: "Calificar Reclamo por Teléfono", dueDate: "Hoy", status: "pending", priority: "high" },
        { id: `tk-${Date.now()}-2`, title: "Programar Inspección Inicial", dueDate: "Mañana", status: "pending", priority: "medium" }
      ]
    };

    setInsuranceClaims((prev) => [newClaim, ...prev]);
    setSelectedInsuranceClaimId(newClaimId);
  };

  // Actions: Claims Estimator View
  const handleUpdateEstimateItem = (itemId: string, qty: number, unitPrice: number) => {
    const updatedItems = estimate.items.map((item) =>
      item.id === itemId ? { ...item, qty, unitPrice, total: qty * unitPrice } : item
    );
    setEstimate(recalculateEstimate(updatedItems));
  };

  const handleAddEstimateItem = (newItem: Omit<EstimateItem, "id" | "total">) => {
    const item: EstimateItem = {
      ...newItem,
      id: `est-custom-${Date.now()}`,
      total: newItem.qty * newItem.unitPrice
    };
    const updatedItems = [...estimate.items, item];
    setEstimate(recalculateEstimate(updatedItems));
  };

  const handleDeleteEstimateItem = (itemId: string) => {
    const updatedItems = estimate.items.filter((item) => item.id !== itemId);
    setEstimate(recalculateEstimate(updatedItems));
  };

  const handleAutoAdjustMargin = () => {
    // We target a 30% profit margin overall by adjusting the Mano de Obra (Labor) Unit Price (est-i4)
    const laborItem = estimate.items.find((item) => item.category === "labor");
    if (!laborItem) return;

    let costNonLabor = 0;
    let sellNonLabor = 0;

    estimate.items.forEach((item) => {
      if (item.category !== "labor") {
        let costFactor = 0.6;
        if (item.description.includes("Shingle")) costFactor = 80 / 120;
        else if (item.description.includes("Underlayment")) costFactor = 50 / 85;
        else if (item.description.includes("Ridge") || item.description.includes("Venting")) costFactor = 8 / 12.5;
        else if (item.category === "fee") costFactor = 1.0;

        costNonLabor += item.qty * (item.unitPrice * costFactor);
        sellNonLabor += item.qty * item.unitPrice;
      }
    });

    // Assume Labor Crew Cost is constant $60 per unit SQ
    const laborCrewCost = laborItem.qty * 60;
    const totalCost = costNonLabor + laborCrewCost;

    // Target Gross Sell Price to achieve exactly 30% margin
    // Formula: (TargetGross - totalCost) / TargetGross = 0.3 => TargetGross * 0.7 = totalCost => TargetGross = totalCost / 0.7
    const targetGross = totalCost / 0.7;
    const targetLaborSellTotal = targetGross - sellNonLabor;
    const targetLaborUnitPrice = Math.round((targetLaborSellTotal / laborItem.qty) * 10) / 10;

    const updatedItems = estimate.items.map((item) =>
      item.category === "labor"
        ? { ...item, unitPrice: targetLaborUnitPrice, total: item.qty * targetLaborUnitPrice }
        : item
    );

    const adjustedEst = recalculateEstimate(updatedItems);
    setEstimate(adjustedEst);
  };

  const handleUpdateHomeownerDetails = (field: "clientName" | "address" | "clientPhone" | "clientEmail", value: string) => {
    setEstimate((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateStatus = (status: "Draft" | "Sent" | "Approved") => {
    setEstimate((prev) => ({ ...prev, status }));
    if (status === "Approved") {
      // Create or move projects to production pipeline
      const exists = projects.find((p) => p.title.includes(estimate.clientName));
      if (!exists) {
        const newProj: KanbanProject = {
          id: `p-auto-${Date.now()}`,
          projectCode: `PRJ-${Math.floor(8000 + Math.random() * 99)}`,
          title: `${estimate.clientName} Residence`,
          address: estimate.address,
          category: "Architectural Shingle",
          durationEstimate: "Est. 3 Days",
          status: "scheduled",
          statusText: "Scheduled",
          isWarning: false
        };
        setProjects((prev) => [...prev, newProj]);
      }
    }
  };

  // Actions: Production Kanban View
  const handleMoveProject = (projectId: string, direction: "next" | "prev") => {
    const stages: KanbanProject["status"][] = ["scheduled", "ordered", "in_progress", "qa"];
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const currentIndex = stages.indexOf(p.status);
          let newIndex = currentIndex;
          if (direction === "next" && currentIndex < stages.length - 1) {
            newIndex += 1;
          } else if (direction === "prev" && currentIndex > 0) {
            newIndex -= 1;
          }
          const nextStatus = stages[newIndex];
          const statusTexts = {
            scheduled: "Scheduled",
            ordered: "Material Ordered",
            in_progress: "In Progress",
            qa: "QA Inspection"
          };
          return {
            ...p,
            status: nextStatus,
            statusText: statusTexts[nextStatus],
            progress: nextStatus === "in_progress" ? 10 : nextStatus === "qa" ? 95 : undefined
          };
        }
        return p;
      })
    );
  };

  const handleStartQA = (project: KanbanProject) => {
    // Move project out or mark as successfully done
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    // Add completed invoice to financial dashboard
    const newInvoice: Invoice = {
      id: `inv-auto-${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(4000 + Math.random() * 99)}`,
      clientName: project.title.replace(" Residence", "").replace(" Estate", ""),
      projectCategory: project.category,
      amount: 14500,
      status: "Pending"
    };
    setInvoices((prev) => [newInvoice, ...prev]);

    // Add notification
    setCriticalAlerts((prev) =>
      prev.filter((a) => !a.title.includes(project.projectCode))
    );
  };

  // Action: Dashboard Resolutions
  const handleResolveAlert = (alert: CriticalAlert) => {
    setCriticalAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    if (alert.targetId) {
      if (alert.targetId.startsWith("APX")) {
        setCurrentView(ViewType.LEADS);
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

  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f7f9fb] text-[#191c1e] font-sans antialiased overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => {
          setCurrentView(view);
          setMobileMenuOpen(false);
        }}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* Header - Mobile */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#131b2e] text-white border-b border-white/15 shrink-0 select-none">
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
            { id: ViewType.LEADS, label: "Leads Directory" },
            { id: ViewType.INSURANCE_CLAIM, label: "Insurance Claim" },
            { id: ViewType.CLAIMS, label: "Retail Estimator" },
            { id: ViewType.PRODUCTION, label: "Production Pipeline" },
            { id: ViewType.FINANCIALS, label: "Financials Overview" },
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
                  ? "bg-[#6cf8bb] text-[#002113] font-bold" 
                  : "text-[#7c839b] hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-400 hover:text-red-300 hover:bg-white/5 transition-all mt-4 border-t border-white/10 pt-4"
          >
            Cerrar Sesión
          </button>
        </div>
      )}

      {/* Main Container Content viewport */}
      <main className="flex-1 flex flex-col xl:flex-row h-screen overflow-hidden md:ml-[280px]">
        
        {/* Render View selection */}
        {currentView === ViewType.DASHBOARD && (
          <MainDashboard
            kpis={[
              { title: "Leads del Día", value: `${leads.length + 22}`, trend: "+12%", trendDirection: "up", subtitle: "Prospectos calificados nuevos hoy", icon: "users" },
              { title: "Reclamos Activos", value: "156", trend: "8 Críticos", trendDirection: "down", subtitle: "Reclamos ingresados a aseguradoras", icon: "file-text" },
              { title: "Prod. en Curso", value: `${projects.length + 38}`, trend: "65% Completo", trendDirection: "up", subtitle: "Proyectos en proceso de techado", icon: "hard-hat", progress: 65 },
              { title: "Pagos Pendientes", value: `$124.5K`, trend: "14 Facturas", trendDirection: "down", subtitle: "Facturas pendientes de cobro", icon: "dollar-sign" }
            ]}
            alerts={criticalAlerts}
            inspections={inspections}
            onResolveAlert={handleResolveAlert}
            onNavigateToView={setCurrentView}
            onNavigateToLead={handleSelectLead}
          />
        )}

        {currentView === ViewType.LEADS && (
          <LeadsView
            leads={leads}
            selectedLeadId={selectedLeadId}
            onSelectLead={handleSelectLead}
            onAddTimelineEvent={handleAddTimelineEvent}
            onToggleTask={handleToggleTask}
            onAddLead={handleAddLead}
          />
        )}

        {currentView === ViewType.INSURANCE_CLAIM && (
          <LeadsView
            leads={insuranceClaims}
            selectedLeadId={selectedInsuranceClaimId}
            onSelectLead={handleSelectInsuranceClaim}
            onAddTimelineEvent={handleAddInsuranceClaimTimelineEvent}
            onToggleTask={handleToggleInsuranceClaimTask}
            onAddLead={handleAddInsuranceClaim}
            viewTitle="Expedientes de Insurance Claim"
            viewSubtitle="Cronologías de reclamos de seguros, visitas de peritos y archivos técnicos de propiedad."
            addButtonLabel="Nuevo Reclamo de Seguro"
            formTitle="Ficha de Nueva Reclamación de Seguro"
            formSubmitLabel="Registrar Reclamación"
            isInsuranceView={true}
          />
        )}

        {currentView === ViewType.CLAIMS && (
          <EstimatorView
            estimate={estimate}
            onUpdateEstimateItem={handleUpdateEstimateItem}
            onAddEstimateItem={handleAddEstimateItem}
            onDeleteEstimateItem={handleDeleteEstimateItem}
            onAutoAdjustMargin={handleAutoAdjustMargin}
            onUpdateStatus={handleUpdateStatus}
            onUpdateHomeownerDetails={handleUpdateHomeownerDetails}
          />
        )}

        {currentView === ViewType.PRODUCTION && (
          <ProductionView
            projects={projects}
            onMoveProject={handleMoveProject}
            onStartQA={handleStartQA}
          />
        )}

        {currentView === ViewType.FINANCIALS && (
          <FinancialsView
            invoices={invoices}
          />
        )}

        {currentView === ViewType.TEAM && (
          <TeamView
            members={teamMembers}
          />
        )}

      </main>
    </div>
  );
}
