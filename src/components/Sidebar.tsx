import React from "react";
import logo from "../../LogoNegativo-copia.png";
import { ViewType } from "../types";
import { 
  LayoutDashboard, 
  Users, 
  FileSignature, 
  HardHat, 
  DollarSign, 
  Users2, 
  Settings, 
  HelpCircle,
  Plus,
  FileCheck2
} from "lucide-react";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { type: ViewType.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
    { type: ViewType.LEADS, label: "Leads", icon: Users },
    { type: ViewType.INSURANCE_CLAIM, label: "Insurance Claim", icon: FileCheck2 },
    { type: ViewType.CLAIMS, label: "Retail", icon: FileSignature },
    { type: ViewType.PRODUCTION, label: "Production", icon: HardHat },
    { type: ViewType.FINANCIALS, label: "Financials", icon: DollarSign },
    { type: ViewType.TEAM, label: "Team", icon: Users2 },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen w-[280px] bg-[#131b2e] text-white p-4 fixed left-0 top-0 z-50 shrink-0 select-none">
      {/* Brand Header */}
      <div className="mb-8 px-2 py-3 flex items-center justify-center">
        <img 
          src={logo} 
          alt="Xapcon Group Logo" 
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.type;
          return (
            <button
              key={item.type}
              onClick={() => onViewChange(item.type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? "bg-[#6cf8bb] text-[#002113] font-bold shadow-sm" 
                  : "text-[#7c839b] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#002113]" : "text-[#7c839b]"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="mt-auto pt-4 border-t border-white/10 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#7c839b] hover:text-white hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4 text-[#7c839b]" />
          <span>Configuración</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#7c839b] hover:text-white hover:bg-white/5 transition-all">
          <HelpCircle className="w-4 h-4 text-[#7c839b]" />
          <span>Soporte Técnico</span>
        </button>
      </div>
    </nav>
  );
}
