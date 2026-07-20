import React from "react";
import { Invoice, Lead, ViewType } from "../types";
import { 
  TrendingUp, 
  DollarSign, 
  Receipt,
  Eye,
  AlertCircle,
  TrendingDown,
  Layers,
  Activity
} from "lucide-react";

interface FinancialsViewProps {
  invoices: Invoice[];
  leads: Lead[];
  onNavigateToLead?: (leadId: string) => void;
}

export default function FinancialsView({ invoices, leads, onNavigateToLead }: FinancialsViewProps) {
  // Filter leads/claims that have cash flow data entered
  const dbLeadsWithCash = leads.filter(
    (l) => l.estimate?.cashData && Object.keys(l.estimate.cashData).length > 0
  );

  const displayLeadsWithCash = dbLeadsWithCash;
  const isDemoData = false; // Mock fallback removed to prevent generic data rendering

  // Consolidated financial variables
  let totalRCV = 0;
  let totalCollected = 0;
  let totalExecutionCosts = 0;
  let totalAR = 0;

  // Cost items breakdown
  let totalMaterial = 0;
  let totalLabor = 0;
  let totalTax = 0;
  let totalPermisos = 0;
  let totalLoss = 0;

  // Collection stage details
  let totalPrimerCheque = 0;
  let totalSegundoCheque = 0;
  let totalTercerCheque = 0;
  let totalDeducible = 0;
  let totalSuplementoIncome = 0;

  displayLeadsWithCash.forEach((l) => {
    const c = l.estimate!.cashData!;
    const rcv = c.rcv || 0;
    totalRCV += rcv;

    // Checks income
    const pCheque = c.primerCheque || 0;
    const sCheque = c.segundoCheque || 0;
    const tCheque = c.tercerCheque || 0;
    const ded = c.deducible || 0;
    const sup1 = c.suplemento1 || 0;
    const sup2 = c.suplemento2 || 0;
    const sup3 = c.suplemento3 || 0;

    totalPrimerCheque += pCheque;
    totalSegundoCheque += sCheque;
    totalTercerCheque += tCheque;
    totalDeducible += ded;
    totalSuplementoIncome += (sup1 + sup2 + sup3);

    const collected = pCheque + sCheque + tCheque + ded + sup1 + sup2 + sup3;
    totalCollected += collected;

    // Costs
    const mat = c.valorMaterial || 0;
    const lab = c.valorLabor || 0;
    const tx = c.valorTax || 0;
    const perm = c.valorPermisos || 0;
    const loss = c.perdidaRepentina || 0;

    totalMaterial += mat;
    totalLabor += lab;
    totalTax += tx;
    totalPermisos += perm;
    totalLoss += loss;

    const cost = mat + lab + tx + perm + loss;
    totalExecutionCosts += cost;

    // AR calculation per lead (RCV - Collected)
    totalAR += Math.max(rcv - collected, 0);
  });

  const netProfit = totalCollected - totalExecutionCosts;
  const profitMargin = totalCollected > 0 ? (netProfit / totalCollected) * 100 : 0;

  // Percentages for consolidated cost breakdown
  const totalFinancialVolume = Math.max(totalCollected, totalExecutionCosts, 1);
  const materialPct = (totalMaterial / totalFinancialVolume) * 100;
  const laborPct = (totalLabor / totalFinancialVolume) * 100;
  const otherCosts = totalTax + totalPermisos + totalLoss;
  const otherPct = (otherCosts / totalFinancialVolume) * 100;
  const profitPct = netProfit > 0 ? (netProfit / totalFinancialVolume) * 100 : 0;

  // Helper breakdown parser for single projects
  const getLeadFinancialBreakdown = (l: Lead) => {
    const c = l.estimate?.cashData;
    if (!c) return null;
    
    const primerCheque = c.primerCheque || 0;
    const segundoCheque = c.segundoCheque || 0;
    const tercerCheque = c.tercerCheque || 0;
    const deducible = c.deducible || 0;
    const sup1 = c.suplemento1 || 0;
    const sup2 = c.suplemento2 || 0;
    const sup3 = c.suplemento3 || 0;
    const revenue = primerCheque + segundoCheque + tercerCheque + deducible + sup1 + sup2 + sup3;
    
    const mat = c.valorMaterial || 0;
    const lab = c.valorLabor || 0;
    const tax = c.valorTax || 0;
    const perm = c.valorPermisos || 0;
    const loss = c.perdidaRepentina || 0;
    const cost = mat + lab + tax + perm + loss;
    
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    const totalRepresented = Math.max(revenue, cost, 1);
    
    const matPct = (mat / totalRepresented) * 100;
    const labPct = (lab / totalRepresented) * 100;
    const otherCostsVal = tax + perm + loss;
    const otherPctVal = (otherCostsVal / totalRepresented) * 100;
    const profitPctVal = profit > 0 ? (profit / totalRepresented) * 100 : 0;
    
    return {
      revenue,
      cost,
      profit,
      margin,
      mat,
      lab,
      otherCostsVal,
      matPct,
      labPct,
      otherPctVal,
      profitPctVal
    };
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#131b2e] tracking-tight">Financial Overview</h1>
          <p className="text-xs text-[#7c839b] mt-1 font-medium">Control de utilidades y flujos de caja consolidados en base a los expedientes de reclamos activos.</p>
        </div>
        {isDemoData && (
          <span className="px-3 py-1 bg-yellow-50 text-[#ca8a04] text-[10px] rounded-lg font-bold border border-yellow-200 animate-pulse flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Mostrando Datos Demo (Robertson & Rostova)
          </span>
        )}
      </div>



      {/* Primary KPI Cards (Directly fed by cash section) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        {/* RCV Aprobado */}
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">RCV Aprobado Consolidado</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-yellow-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#131b2e] tracking-tight font-mono">
              ${totalRCV.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-[#7c839b] font-medium block mt-1">
            Volumen total estimado de seguros
          </span>
        </div>

        {/* Recaudado (Cash In) */}
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Total Recaudado (Efectivo)</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-700 tracking-tight font-mono">
              ${totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">
            Dinero real cobrado e ingresado
          </span>
        </div>

        {/* Cuentas Por Cobrar */}
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Por Cobrar (AR de Reclamos)</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-red-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-red-700 tracking-tight font-mono">
              ${totalAR.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-[10px] text-red-500 font-semibold block mt-1">
            Diferencia pendiente (Depreciaciones)
          </span>
        </div>

        {/* Margen Operativo Neto */}
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#7c839b]">Margen Neto del Portafolio</span>
            <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-teal-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-teal-700 tracking-tight font-mono">
              {profitMargin.toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full flex items-center">
              Net Profit: ${netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[10px] text-[#7c839b] font-medium block mt-1">
            Rentabilidad sobre efectivo cobrado
          </span>
        </div>
      </div>

      {/* Main Charts & Table section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Cost Breakdown & Payment Stages */}
        <div className="lg:col-span-5 space-y-6">
          {/* Consolidated Cost Breakdown */}
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-[#131b2e]">Desglose de Egresos Consolidado</h2>
              <p className="text-[10px] text-[#7c839b]">Distribución del dinero invertido frente a la utilidad neta.</p>
            </div>

            <div className="flex h-6 rounded-full overflow-hidden bg-slate-100 shadow-inner w-full">
              <div style={{ width: `${materialPct}%` }} className="bg-amber-500 transition-all duration-300" title={`Material: $${totalMaterial.toLocaleString()}`}></div>
              <div style={{ width: `${laborPct}%` }} className="bg-teal-500 transition-all duration-300" title={`Labor: $${totalLabor.toLocaleString()}`}></div>
              <div style={{ width: `${otherPct}%` }} className="bg-blue-500 transition-all duration-300" title={`Impuestos y Gastos: $${otherCosts.toLocaleString()}`}></div>
              <div style={{ width: `${profitPct}%` }} className="bg-emerald-500 transition-all duration-300" title={`Utilidad Neta: $${netProfit.toLocaleString()}`}></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="flex items-center gap-2 font-medium">
                <div className="w-3 h-3 bg-amber-500 rounded-sm shrink-0"></div>
                <span className="text-slate-600">Materiales:</span>
                <span className="font-bold text-slate-800 font-mono">${totalMaterial.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({materialPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <div className="w-3 h-3 bg-teal-500 rounded-sm shrink-0"></div>
                <span className="text-slate-600">Mano de Obra:</span>
                <span className="font-bold text-slate-800 font-mono">${totalLabor.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({laborPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <div className="w-3 h-3 bg-blue-500 rounded-sm shrink-0"></div>
                <span className="text-slate-600">Otros Egresos:</span>
                <span className="font-bold text-slate-800 font-mono">${otherCosts.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({otherPct.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <div className="w-3 h-3 bg-emerald-500 rounded-sm shrink-0"></div>
                <span className="text-slate-600">Utilidad Neta:</span>
                <span className="font-bold text-slate-800 font-mono">${netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({profitPct.toFixed(0)}%)</span>
              </div>
            </div>
            {totalLoss > 0 && (
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-[11px] text-red-800">
                <TrendingDown className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Fuga por Pérdida Repentina: </span>
                  Se han registrado <span className="font-bold font-mono">${totalLoss.toLocaleString()} USD</span> en pérdidas imprevistas ejecutando la obra.
                </div>
              </div>
            )}
          </div>

          {/* Payment Collection Stages */}
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold text-[#131b2e]">Estado de Recaudación de Cheques</h2>
              <p className="text-[10px] text-[#7c839b]">Cheques procesados por la aseguradora y cobrados al cliente.</p>
            </div>

            <div className="space-y-3.5">
              {[
                { label: "1. Primer Cheque (ACV)", val: totalPrimerCheque, color: "bg-emerald-500", desc: "Recibido al firmar contrato" },
                { label: "2. Segundo Cheque (Progreso)", val: totalSegundoCheque, color: "bg-emerald-500", desc: "Recibido a mitad de obra" },
                { label: "3. Tercer Cheque (Depreciación)", val: totalTercerCheque, color: totalTercerCheque > 0 ? "bg-emerald-500" : "bg-slate-300", desc: "Recuperación final de depreciación" },
                { label: "4. Deducibles de Cliente", val: totalDeducible, color: "bg-emerald-500", desc: "Cobrado directamente al asegurado" },
                { label: "5. Suplementos Aprobados", val: totalSuplementoIncome, color: totalSuplementoIncome > 0 ? "bg-emerald-500" : "bg-slate-300", desc: "Ingresos adicionales aprobados" }
              ].map((stage, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                      <span className="text-xs font-bold text-[#131b2e]">{stage.label}</span>
                    </div>
                    <span className="text-[10px] text-[#7c839b] block pl-4">{stage.desc}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-800 shrink-0">
                    ${stage.val.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Table list of leads */}
        <div className="lg:col-span-7 bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-xs font-bold text-[#131b2e]">Rentabilidad y Control de Flujo por Proyecto</h2>
            <p className="text-[10px] text-[#7c839b]">Detalle individualizado por caso para toma de decisiones.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="bg-[#f7f9fb] border-b border-[#eceef0] text-[#7c839b] text-[10px] font-mono uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Caso / Claim</th>
                  <th className="py-2.5 px-3">Ingresos</th>
                  <th className="py-2.5 px-3">Gastos</th>
                  <th className="py-2.5 px-3">Utilidad</th>
                  <th className="py-2.5 px-3">Margen</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eceef0] text-xs">
                {displayLeadsWithCash.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans font-medium text-xs">
                      No hay expedientes con flujo de caja activo. Registra transacciones en la pestaña 'Flujo de Caja' de cualquier expediente para ver los resultados aquí.
                    </td>
                  </tr>
                ) : (
                  displayLeadsWithCash.map((lead) => {
                    const b = getLeadFinancialBreakdown(lead);
                    if (!b) return null;
                  const isHealthy = b.margin >= 30;
                  const isWarning = b.margin >= 20 && b.margin < 30;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#191c1e]">{lead.name}</div>
                        <div className="text-[9px] text-gray-500 font-mono mt-0.5">{lead.claimNumber || "Sin Claim #"}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        ${b.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        ${b.cost.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`py-3 px-3 font-mono font-bold ${b.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        ${b.profit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          isHealthy 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                            : isWarning
                            ? "bg-amber-50 text-amber-800 border-amber-100"
                            : "bg-red-50 text-red-800 border-red-100 animate-pulse"
                        }`}>
                          {b.margin.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {onNavigateToLead && (
                          <button
                            onClick={() => onNavigateToLead(lead.id)}
                            className="p-1 text-[#ca8a04] hover:bg-[#ca8a04]/10 rounded-lg transition-colors inline-flex items-center gap-0.5"
                            title="Auditar en Expediente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold">Auditar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Invoices and traditional accounts section */}
      <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-xs font-bold text-[#131b2e]">Facturas Comerciales Emitidas & Estado de Pago</h2>
          <p className="text-[10px] text-[#7c839b]">Lista general de facturación y cobranza.</p>
        </div>
        
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
                        ? "bg-yellow-50 text-[#854d0e] border-yellow-200" 
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
    </div>
  );
}
