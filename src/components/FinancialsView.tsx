import React from "react";
import { Invoice } from "../types";
import { 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Receipt
} from "lucide-react";

interface FinancialsViewProps {
  invoices: Invoice[];
}

export default function FinancialsView({ invoices }: FinancialsViewProps) {
  // Bento Chart statistics
  const charts = [
    { label: "Commercial Flat", margin: 42, color: "bg-emerald-500" },
    { label: "Metal Roofing", margin: 38, color: "bg-teal-500" },
    { label: "Residential Asphalt", margin: 24, color: "bg-amber-500" },
    { label: "Repairs & Maint.", margin: 55, color: "bg-blue-500" }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Finanzas & Facturación</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Análisis de rentabilidad por tipo de techado, saldos pendientes por cobrar (AR) y comisiones.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Total Revenue (YTD)</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#131b2e] tracking-tight">$1,245,200</span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center">
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> +12%
            </span>
          </div>
          <span className="text-[10px] text-[#7c839b] font-medium block mt-1">Comparado con el trimestre anterior</span>
        </div>

        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Overdue Receivables (AR)</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-red-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#131b2e] tracking-tight">$342,150</span>
            <span className="text-[10px] font-bold bg-red-50 text-red-700 px-1.5 py-0.5 rounded-full flex items-center">
              15 Facturas
            </span>
          </div>
          <span className="text-[10px] text-red-600 font-bold block mt-1">Reclamos retenidos por seguros</span>
        </div>

        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Net Profit Margin</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#131b2e] tracking-tight">33.7%</span>
            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full flex items-center">
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> +2.4%
            </span>
          </div>
          <span className="text-[10px] text-[#7c839b] font-medium block mt-1">Promedio de utilidad neta global</span>
        </div>

        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Pending Commissions</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#131b2e] tracking-tight">$84,300</span>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center">
              Este Viernes
            </span>
          </div>
          <span className="text-[10px] text-[#7c839b] font-medium block mt-1">Comisiones de ventas calculadas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Invoice list */}
        <div className="lg:col-span-8 bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-sans text-xs font-bold text-[#131b2e]">Facturas Emitidas & Estado de Pago</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="bg-[#f7f9fb] border-b border-[#eceef0] text-[#7c839b] text-[10px] font-mono uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-4">Factura</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Línea de Obra</th>
                  <th className="py-2.5 px-4 text-right">Monto</th>
                  <th className="py-2.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceef0] text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#131b2e]">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-bold text-[#191c1e]">{inv.clientName}</td>
                    <td className="py-3 px-4 text-[#7c839b]">{inv.projectCategory}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#131b2e]">${inv.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        inv.status === "Paid" 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                          : inv.status === "Overdue"
                          ? "bg-red-50 text-red-800 border-red-100 animate-pulse"
                          : "bg-amber-50 text-amber-800 border-amber-100"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Bento charts */}
        <div className="lg:col-span-4 bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b pb-2 mb-2">
            <h2 className="font-sans text-xs font-bold text-[#131b2e]">Margen por Línea de Servicio</h2>
            <p className="text-[10px] text-[#7c839b]">Comparación de rentabilidad promedio.</p>
          </div>

          <div className="space-y-4">
            {charts.map((ch, idx) => (
              <div key={idx} className="space-y-1 select-none">
                <div className="flex justify-between text-xs font-bold text-[#45464d]">
                  <span>{ch.label}</span>
                  <span>{ch.margin}%</span>
                </div>
                <div className="w-full bg-[#eceef0] rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${ch.margin}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
