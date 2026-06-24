import React, { useState } from "react";
import { Estimate, EstimateItem } from "../types";
import { 
  FileSignature, 
  Trash2, 
  Plus, 
  Calculator, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  FileText,
  Users
} from "lucide-react";

interface EstimatorViewProps {
  estimate: Estimate;
  onUpdateEstimateItem: (itemId: string, qty: number, unitPrice: number) => void;
  onAddEstimateItem: (item: Omit<EstimateItem, "id" | "total">) => void;
  onDeleteEstimateItem: (itemId: string) => void;
  onAutoAdjustMargin: () => void;
  onUpdateStatus: (status: "Draft" | "Sent" | "Approved") => void;
  onUpdateHomeownerDetails: (field: "clientName" | "address" | "clientPhone" | "clientEmail", value: string) => void;
}

export default function EstimatorView({
  estimate,
  onUpdateEstimateItem,
  onAddEstimateItem,
  onDeleteEstimateItem,
  onAutoAdjustMargin,
  onUpdateStatus,
  onUpdateHomeownerDetails
}: EstimatorViewProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<"material" | "labor" | "fee">("material");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("SQ");
  const [newPrice, setNewPrice] = useState(100);
  const [includeWarranty, setIncludeWarranty] = useState(true);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;
    onAddEstimateItem({
      description: newDesc.trim(),
      category: newCategory,
      qty: Number(newQty) || 1,
      unit: newUnit || "SQ",
      unitPrice: Number(newPrice) || 0
    });
    setNewDesc("");
    setIsAddingItem(false);
  };

  const isMarginUnderStandard = estimate.profitMargin < 30;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Estimador Retail</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Borrador de presupuestos de venta directa (Retail) con validación de márgenes de ganancia.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onUpdateStatus("Sent")}
            className={`px-3 py-1.5 border border-[#c6c6cd] text-[#45464d] text-xs font-semibold rounded-lg transition-colors ${estimate.status === "Sent" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-white hover:bg-slate-100"}`}
          >
            Enviar a Cliente
          </button>
          <button 
            onClick={() => onUpdateStatus("Approved")}
            className={`px-3 py-1.5 bg-[#006c49] hover:bg-[#005236] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm`}
          >
            Aprobar Estimado
          </button>
        </div>
      </div>

      {/* Homeowner Details Card */}
      <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[#006c49] shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-xs font-bold text-[#131b2e]">Datos del Homeowner (Propietario)</h2>
              <p className="text-[10px] text-[#7c839b] font-medium">Información de contacto y dirección de la obra</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-[#7c839b] font-medium">Estado:</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 ${
              estimate.status === "Approved" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              {estimate.status}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Nombre</label>
            <input 
              type="text"
              value={estimate.clientName}
              onChange={(e) => onUpdateHomeownerDetails("clientName", e.target.value)}
              className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none transition-all font-medium"
              placeholder="Nombre del Homeowner"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Dirección de la Obra</label>
            <input 
              type="text"
              value={estimate.address}
              onChange={(e) => onUpdateHomeownerDetails("address", e.target.value)}
              className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none transition-all font-medium"
              placeholder="Dirección completa"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Teléfono</label>
            <input 
              type="text"
              value={estimate.clientPhone || ""}
              onChange={(e) => onUpdateHomeownerDetails("clientPhone", e.target.value)}
              className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none transition-all font-medium font-mono"
              placeholder="Teléfono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Correo Electrónico</label>
            <input 
              type="email"
              value={estimate.clientEmail || ""}
              onChange={(e) => onUpdateHomeownerDetails("clientEmail", e.target.value)}
              className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#006c49] outline-none transition-all font-medium"
              placeholder="Correo electrónico"
            />
          </div>
        </div>
      </div>

      {/* Item List Table Card */}
      <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#eceef0] flex items-center justify-between">
          <h2 className="font-sans text-xs font-bold text-[#131b2e]">Desglose de Conceptos de Construcción</h2>
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="text-xs text-[#006c49] font-bold flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir Concepto
          </button>
        </div>

        {isAddingItem && (
          <form onSubmit={handleAddItem} className="p-4 bg-[#f7f9fb] border-b border-[#eceef0] grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Descripción</label>
              <input 
                type="text" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ej. Tejas de asfalto" 
                className="w-full bg-white border border-[#c6c6cd] rounded-lg p-1.5 text-xs text-[#191c1e]"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Categoría</label>
              <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-white border border-[#c6c6cd] rounded-lg p-1.5 text-xs text-[#191c1e]"
              >
                <option value="material">Material</option>
                <option value="labor">Mano de Obra</option>
                <option value="fee">Tasa / Permiso</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Cant.</label>
              <input 
                type="number" 
                value={newQty} 
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="w-full bg-white border border-[#c6c6cd] rounded-lg p-1.5 text-xs text-[#191c1e]"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Unidad</label>
              <input 
                type="text" 
                value={newUnit} 
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full bg-white border border-[#c6c6cd] rounded-lg p-1.5 text-xs text-[#191c1e]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-[#7c839b] mb-1">P. Unitario</label>
              <input 
                type="number" 
                value={newPrice} 
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-full bg-white border border-[#c6c6cd] rounded-lg p-1.5 text-xs text-[#191c1e]"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsAddingItem(false)}
                className="flex-1 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-1.5 bg-[#006c49] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Add
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto select-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f7f9fb] border-b border-[#eceef0] text-[#7c839b] text-[10px] font-mono uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4 text-center">Unidad</th>
                <th className="py-3 px-4 text-right">Precio Unitario</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0]">
              {estimate.items.map((item) => (
                <tr key={item.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-[#191c1e] block">{item.description}</span>
                      <span className="text-[10px] text-[#7c839b] font-mono uppercase bg-[#eceef0] px-1.5 py-0.5 rounded w-max block">{item.category}</span>
                      {item.warning && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
                          <AlertTriangle className="w-3 h-3" /> Reclamo requiere revisión: {item.warning}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <input 
                      type="number" 
                      value={item.qty}
                      onChange={(e) => onUpdateEstimateItem(item.id, Number(e.target.value), item.unitPrice)}
                      className="w-16 bg-[#f7f9fb] border border-[#c6c6cd]/50 rounded p-1 text-center font-semibold text-xs"
                    />
                  </td>
                  <td className="py-4 px-4 text-center text-[#7c839b] font-medium">{item.unit}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[#7c839b] font-medium">$</span>
                      <input 
                        type="number" 
                        value={item.unitPrice}
                        onChange={(e) => onUpdateEstimateItem(item.id, item.qty, Number(e.target.value))}
                        className="w-20 bg-[#f7f9fb] border border-[#c6c6cd]/50 rounded p-1 text-right font-semibold text-xs"
                      />
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-[#131b2e]">${item.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-4 px-4 text-center">
                    <button 
                      onClick={() => onDeleteEstimateItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary panel + Warranty Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Warranty Digital Contract terms */}
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4 select-none">
          <div className="flex items-center gap-2 border-b pb-2 text-[#131b2e] font-bold text-xs">
            <FileText className="w-4 h-4 text-[#006c49]" />
            <span>Contrato Digital & Términos de Servicio</span>
          </div>
          <p className="text-[11px] text-[#7c839b] leading-relaxed">
            Se requiere la firma del cliente en el contrato digital para iniciar la producción de techado. El seguro pagará directamente el deducible y los costos aprobados menos la depreciación.
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-[#f7f9fb] rounded-lg border border-[#c6c6cd]/20">
            <input 
              type="checkbox" 
              checked={includeWarranty} 
              onChange={() => setIncludeWarranty(!includeWarranty)}
              className="rounded text-[#006c49] focus:ring-[#006c49]"
            />
            <span className="text-xs font-semibold text-[#191c1e]">Incluir adenda de garantía estándar (10 años mano de obra)</span>
          </label>
        </div>

        {/* Totals and Profit Margin widget */}
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-sans text-xs font-bold text-[#131b2e]">Resumen de Cierre de Reclamo</h3>
            <span className="font-sans text-[11px] text-[#7c839b] font-medium">Valores en USD</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#7c839b]">Subtotal Materiales:</span>
              <span className="font-mono font-bold text-[#45464d]">${estimate.subtotalMaterials.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7c839b]">Subtotal Mano de Obra:</span>
              <span className="font-mono font-bold text-[#45464d]">${estimate.subtotalLabor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7c839b]">Permisos y Tasas Administrativas:</span>
              <span className="font-mono font-bold text-[#45464d]">${estimate.subtotalFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-[#131b2e]">
              <span>Subtotal Bruto:</span>
              <span className="font-mono">${estimate.subtotalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[#7c839b]">
              <span>Impuestos ({(estimate.taxRate * 100).toFixed(2)}%):</span>
              <span className="font-mono">${estimate.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-lg text-[#131b2e]">
              <span>Total Estimado:</span>
              <span className="font-mono">${estimate.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Margen de Beneficio indicator */}
          <div className="bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl p-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-[#45464d] flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#006c49]" />
                <span>Margen de Beneficio Estimado</span>
              </span>
              <span className={`font-mono font-bold text-xs ${isMarginUnderStandard ? "text-amber-600" : "text-emerald-600"}`}>
                {estimate.profitMargin}%
              </span>
            </div>
            <div className="w-full bg-[#eceef0] rounded-full h-2 overflow-hidden mb-3">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${isMarginUnderStandard ? "bg-amber-500" : "bg-emerald-500"}`} 
                style={{ width: `${Math.min(100, (estimate.profitMargin / 50) * 100)}%` }}
              ></div>
            </div>

            {isMarginUnderStandard && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-amber-50/60 p-2.5 border border-amber-100 rounded-lg">
                <p className="text-[10px] text-amber-800 font-semibold leading-tight flex-1">
                  El margen proyectado es inferior al estándar mínimo de la empresa (30%).
                </p>
                <button
                  onClick={onAutoAdjustMargin}
                  className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 active:scale-95 transition-all shadow-sm shrink-0"
                >
                  Auto-ajustar al 30%
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
