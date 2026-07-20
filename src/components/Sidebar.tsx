import React from "react";
import logo from "../../LogoNegativo-copia.png";
import { ViewType } from "../types";
import { 
  LayoutDashboard, 
  FileCheck2,
  FileSignature, 
  HardHat, 
  DollarSign, 
  Users2, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  userRole?: "admin" | "contractor";
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const SECTION_MANAGEMENT = [
  { type: ViewType.DASHBOARD,       label: "Dashboard",           icon: LayoutDashboard },
  { type: ViewType.INSURANCE_CLAIM, label: "Insurance Claim",     icon: FileCheck2 },
  { type: ViewType.CLAIMS,          label: "Retail Estimator",    icon: FileSignature },
  { type: ViewType.PRODUCTION,      label: "Production Pipeline", icon: HardHat },
];

const SECTION_ADMIN = [
  { type: ViewType.FINANCIALS, label: "Financials Overview", icon: DollarSign },
];

const SECTION_TEAM = [
  { type: ViewType.TEAM, label: "Personal & Crews", icon: Users2 },
];

export default function Sidebar({ currentView, onViewChange, onLogout, userRole = "admin", collapsed, onToggleCollapse }: SidebarProps) {
  const renderItem = (item: { type: ViewType; label: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    const isActive = currentView === item.type;

    return (
      <button
        key={item.type}
        onClick={() => onViewChange(item.type)}
        title={collapsed ? item.label : undefined}
        className={`btn-responsive flex items-center gap-3 transition-all duration-150 text-sm select-none ${
          isActive ? "nav-item-active" : "nav-item-inactive"
        } ${
          collapsed
            ? "w-10 h-10 rounded-lg justify-center mx-auto"
            : "w-full px-4 py-2.5 rounded-lg"
        }`}
      >
        <Icon className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
        {!collapsed && <span className="font-medium tracking-tight">{item.label}</span>}
      </button>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => {
    if (collapsed) return <div className="h-px bg-white/5 my-2 mx-1" />;
    return (
      <p className="px-4 pt-4 pb-1 text-[9px] font-bold tracking-[0.12em] uppercase text-[#374151]/60 select-none">
        {label}
      </p>
    );
  };

  return (
    <nav
      className={`hidden md:flex flex-col h-screen text-white fixed left-0 top-0 z-50 shrink-0 select-none transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[252px]"
      }`}
      style={{ background: "#0D1117", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Brand Header */}
      <div className={`flex items-center border-b border-white/5 ${collapsed ? "justify-center py-4 px-2" : "justify-between px-5 py-4"}`}>
        {!collapsed && (
          <img
            src={logo}
            alt="Xapcon Group"
            className="h-8 w-auto object-contain"
          />
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#475569] hover:text-[#94A3B8] hover:bg-white/5 transition-colors"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        <SectionLabel label="Gestión" />
        {SECTION_MANAGEMENT.map(renderItem)}

        <SectionLabel label="Administración" />
        {SECTION_ADMIN.map(renderItem)}

        <SectionLabel label="Equipo" />
        {SECTION_TEAM.map(renderItem)}
      </div>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/5 space-y-0.5">
        <button
          className={`btn-responsive nav-item-inactive flex items-center gap-3 text-sm transition-all duration-150 ${
            collapsed ? "w-10 h-10 rounded-lg justify-center mx-auto" : "w-full px-4 py-2.5 rounded-lg"
          }`}
          title="Configuración"
        >
          <Settings className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
          {!collapsed && <span className="font-medium tracking-tight">Configuración</span>}
        </button>

        <button
          onClick={onLogout}
          className={`btn-responsive flex items-center gap-3 text-sm font-medium transition-all duration-150 text-[#EF4444]/70 hover:text-[#EF4444] hover:bg-white/5 rounded-lg ${
            collapsed ? "w-10 h-10 justify-center mx-auto" : "w-full px-4 py-2.5"
          }`}
          title="Cerrar Sesión"
        >
          <LogOut className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </nav>
  );
}
