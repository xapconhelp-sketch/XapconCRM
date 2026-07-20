import React, { useState, useEffect } from "react";
import { Estimate, EstimateItem, Lead } from "../types";
import { 
  FileSignature, 
  Trash2, 
  Plus, 
  Calculator, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Users,
  Search,
  Download,
  Mail,
  X,
  Send,
  Loader2,
  FileCheck2
} from "lucide-react";

interface EstimatorViewProps {
  leads: Lead[];
  onUpdateLeadEstimate: (leadId: string, estimate: Estimate) => Promise<void> | void;
  onAddLead: (lead: Omit<Lead, "id" | "timeline" | "documents" | "tasks" | "createdAt">) => Promise<void> | void;
  onDeleteLead?: (leadId: string) => Promise<void> | void;
}

export default function EstimatorView({
  leads,
  onUpdateLeadEstimate,
  onAddLead,
  onDeleteLead
}: EstimatorViewProps) {
  // Master-Detail State
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingLead, setIsAddingLead] = useState(false);

  // New Lead Form State
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadAddress, setNewLeadAddress] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");

  // Edit concepts states
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<"material" | "labor" | "fee">("material");
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState("SQ");
  const [newPrice, setNewPrice] = useState(100);
  const [includeWarranty, setIncludeWarranty] = useState(true);

  // Simulated email actions
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Sync selected lead when leads list changes
  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads, selectedLeadId]);

  const selectedLead = leads.find(l => l.id === selectedLeadId) || leads[0];

  // Initialize a default estimate if selected lead doesn't have one
  const activeEstimate: Estimate = selectedLead?.estimate || {
    id: `EST-${selectedLead?.id.slice(0, 5).toUpperCase() || "NEW"}`,
    leadId: selectedLead?.id || "",
    clientName: selectedLead?.name || "",
    address: selectedLead?.address || "",
    clientPhone: selectedLead?.phone || "",
    clientEmail: selectedLead?.email || "",
    status: "Draft",
    items: [],
    subtotalMaterials: 0,
    subtotalLabor: 0,
    subtotalFees: 350,
    subtotalGross: 350,
    taxRate: 0.0825,
    taxAmount: 28.88,
    total: 378.88,
    profitMargin: 0
  };

  // Helper: Recalculate Estimate
  const recalculate = (items: EstimateItem[], currentEst: Estimate): Estimate => {
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
        costFactor = 80 / 120;
      } else if (item.description.includes("Underlayment") || item.description.includes("Membrana")) {
        costFactor = 50 / 85;
      } else if (item.description.includes("Ridge") || item.description.includes("Venting")) {
        costFactor = 8 / 12.5;
      } else if (item.description.includes("Labor") || item.description.includes("Mano")) {
        costFactor = 60 / 95;
      } else if (item.category === "fee") {
        costFactor = 1.0;
      }
      totalCost += item.qty * (item.unitPrice * costFactor);
    });

    const profit = subGross - totalCost;
    const profitMargin = subGross > 0 ? Math.round((profit / subGross) * 100 * 10) / 10 : 0;

    return {
      ...currentEst,
      items,
      subtotalMaterials: subMaterials,
      subtotalLabor: subLabor,
      subtotalFees: subFees,
      subtotalGross: subGross,
      taxAmount,
      total,
      profitMargin
    };
  };

  // Actions
  const handleUpdateItem = (itemId: string, qty: number, unitPrice: number) => {
    const updatedItems = activeEstimate.items.map((item) =>
      item.id === itemId ? { ...item, qty, unitPrice, total: qty * unitPrice } : item
    );
    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const newItem: EstimateItem = {
      id: `est-custom-${Date.now()}`,
      description: newDesc.trim(),
      category: newCategory,
      qty: Number(newQty) || 1,
      unit: newUnit || "SQ",
      unitPrice: Number(newPrice) || 0,
      total: (Number(newQty) || 1) * (Number(newPrice) || 0)
    };

    const updatedItems = [...activeEstimate.items, newItem];
    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);

    setNewDesc("");
    setIsAddingItem(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = activeEstimate.items.filter((item) => item.id !== itemId);
    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleAutoAdjustMargin = () => {
    const laborItem = activeEstimate.items.find((item) => item.category === "labor");
    if (!laborItem) return;

    let costNonLabor = 0;
    let sellNonLabor = 0;

    activeEstimate.items.forEach((item) => {
      if (item.category !== "labor") {
        let costFactor = 0.6;
        if (item.description.includes("Shingle") || item.description.includes("Teja")) costFactor = 80 / 120;
        else if (item.description.includes("Underlayment") || item.description.includes("Membrana")) costFactor = 50 / 85;
        else if (item.description.includes("Ridge") || item.description.includes("Venting")) costFactor = 8 / 12.5;
        else if (item.category === "fee") costFactor = 1.0;

        costNonLabor += item.qty * (item.unitPrice * costFactor);
        sellNonLabor += item.qty * item.unitPrice;
      }
    });

    const laborCrewCost = laborItem.qty * 60;
    const totalCost = costNonLabor + laborCrewCost;

    const targetGross = totalCost / 0.7;
    const targetLaborSellTotal = targetGross - sellNonLabor;
    const targetLaborUnitPrice = Math.round((targetLaborSellTotal / laborItem.qty) * 10) / 10;

    const updatedItems = activeEstimate.items.map((item) =>
      item.category === "labor"
        ? { ...item, unitPrice: targetLaborUnitPrice, total: item.qty * targetLaborUnitPrice }
        : item
    );

    const updatedEst = recalculate(updatedItems, activeEstimate);
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleUpdateHomeownerDetails = (field: "clientName" | "address" | "clientPhone" | "clientEmail", value: string) => {
    const updatedEst = { ...activeEstimate, [field]: value };
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  const handleUpdateStatus = (status: "Draft" | "Sent" | "Approved") => {
    const updatedEst = { ...activeEstimate, status };
    onUpdateLeadEstimate(selectedLead.id, updatedEst);
  };

  // Submit new lead
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;

    await onAddLead({
      name: newLeadName.trim(),
      status: "Nuevo",
      address: newLeadAddress.trim(),
      phone: newLeadPhone.trim(),
      email: newLeadEmail.trim(),
      propertyType: "Residential - Single Family",
      sqft: 2000,
      insuranceProvider: "",
      claimNumber: "",
      adjusterName: "N/A",
      assignedRep: "Michael Chen",
      assignedRepAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC"
    });

    setNewLeadName("");
    setNewLeadAddress("");
    setNewLeadPhone("");
    setNewLeadEmail("");
    setIsAddingLead(false);

    setToastMessage("¡Nueva cotización retail creada!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Print PDF Trigger
  const handlePrint = () => {
    window.print();
  };

  // Send email to HO
  const handleSendEmail = () => {
    if (!activeEstimate.clientEmail) {
      alert("Por favor, introduce un correo electrónico para el Homeowner.");
      return;
    }
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setToastMessage(`¡Estimado enviado con éxito a ${activeEstimate.clientEmail}!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }, 2000);
  };

  // Filtering
  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.address && l.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isMarginUnderStandard = activeEstimate.profitMargin < 30;

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-[#f7f9fb]">
      
      {/* CSS Injected print styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Left Sidebar: Retail Directory */}
      <div className="no-print w-[290px] border-r border-[#c6c6cd]/30 bg-white flex flex-col shrink-0 select-none">
        <div className="p-4 border-b border-[#c6c6cd]/30 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">Estimados Retail</h2>
            <button 
              onClick={() => setIsAddingLead(true)}
              className="p-1 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center btn-gold-3d"
              title="Nueva Cotización"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar cotización..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f2f4f6] border border-transparent rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:bg-white focus:border-[#eab308] font-medium"
            />
            <Search className="w-3.5 h-3.5 text-[#7c839b] absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredLeads.length === 0 ? (
            <p className="text-xs text-[#7c839b] text-center py-6 font-medium">No se encontraron cotizaciones.</p>
          ) : (
            filteredLeads.map((l) => {
              const isActive = l.id === selectedLeadId;
              const est = l.estimate || activeEstimate;
              return (
                <div 
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-150 border text-left ${
                    isActive 
                      ? "bg-[#eab308]/10 border-[#eab308] shadow-sm" 
                      : "bg-white border-[#c6c6cd]/20 hover:bg-[#f7f9fb]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {onDeleteLead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Estás seguro de que deseas eliminar la cotización de ${l.name}?`)) {
                              onDeleteLead(l.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                          title="Eliminar Cotización"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-xs font-bold text-[#131b2e] truncate">{l.name}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border shrink-0 ${
                      est.status === "Approved" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : est.status === "Sent" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}>
                      {est.status === "Approved" ? "Aprobado" : est.status === "Sent" ? "Enviado" : "Borrador"}
                    </span>
                  </div>
                  {l.address && (
                    <span className="text-[10px] text-[#7c839b] block truncate mt-0.5 font-medium">{l.address}</span>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-gray-100">
                    <span className="text-[10px] text-[#7c839b] font-medium">{l.createdAt}</span>
                    <span className="text-xs font-bold text-[#131b2e] font-mono">
                      ${(est.total || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content: Active Estimator Editor */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {!selectedLead ? (
          <div className="no-print flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-[#ca8a04] mb-4">
              <FileSignature className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#131b2e]">Sin Estimados Retail</h2>
            <p className="text-xs text-[#7c839b] mt-1 max-w-sm font-medium">Comienza registrando tu primera cotización de venta directa en el sistema.</p>
            <button 
              onClick={() => setIsAddingLead(true)}
              className="mt-4 px-4 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 btn-gold-3d"
            >
              Crear Cotización Retail
            </button>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-6">
            
            {/* Header / Actions */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
              <div>
                <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Estimador Retail</h1>
                <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Borrador de presupuestos de venta directa (Retail) con validación de márgenes de ganancia.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white border border-[#c6c6cd] hover:bg-slate-100 text-[#45464d] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Descargar versión PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar PDF
                </button>
                <button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="px-3 py-1.5 bg-white border border-[#c6c6cd] hover:bg-slate-100 text-[#45464d] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="Enviar al correo del Homeowner"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ca8a04]" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Enviar al HO
                </button>
                <button 
                  onClick={() => handleUpdateStatus("Approved")}
                  className={`px-3 py-1.5 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm btn-gold-3d`}
                >
                  Aprobar Estimado
                </button>
              </div>
            </div>

            {/* Print Section (Wraps details inside a printable preview) */}
            <div id="print-area" className="space-y-6">
              
              {/* PDF Header Branding (Only visible on print/PDF) */}
              <div className="hidden print:flex justify-between items-start border-b-2 border-gray-200 pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#131b2e] tracking-tight uppercase">PRESUPUESTO DE CONSTRUCCIÓN</h1>
                  <span className="text-xs text-gray-500 block mt-1 font-mono">Xapcon Group - Lic. #98240-TX</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-700 block">Cotización: {activeEstimate.id}</span>
                  <span className="text-[10px] text-gray-500 block">Fecha: {selectedLead.createdAt}</span>
                </div>
              </div>

              {/* Homeowner Details Card */}
              <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-[#ca8a04] shrink-0 print:hidden">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-sans text-xs font-bold text-[#131b2e]">Datos del Homeowner (Propietario)</h2>
                      <p className="text-[10px] text-[#7c839b] font-medium print:hidden">Información de contacto y dirección de la obra</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <span className="font-sans text-xs text-[#7c839b] font-medium">Estado:</span>
                    <select 
                      value={activeEstimate.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="bg-gray-50 border border-gray-300 rounded-lg py-1 px-2 text-[10px] font-bold text-[#131b2e] outline-none cursor-pointer"
                    >
                      <option value="Draft">Borrador (Draft)</option>
                      <option value="Sent">Enviado (Sent)</option>
                      <option value="Approved">Aprobado (Approved)</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Inputs render as editable inside UI, but static text in print mode */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Nombre</label>
                    <input 
                      type="text"
                      value={activeEstimate.clientName}
                      onChange={(e) => handleUpdateHomeownerDetails("clientName", e.target.value)}
                      className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Nombre del Homeowner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Dirección de la Obra</label>
                    <input 
                      type="text"
                      value={activeEstimate.address}
                      onChange={(e) => handleUpdateHomeownerDetails("address", e.target.value)}
                      className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Dirección completa"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Teléfono</label>
                    <input 
                      type="text"
                      value={activeEstimate.clientPhone || ""}
                      onChange={(e) => handleUpdateHomeownerDetails("clientPhone", e.target.value)}
                      className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Teléfono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7c839b] mb-1">Correo Electrónico</label>
                    <input 
                      type="email"
                      value={activeEstimate.clientEmail || ""}
                      onChange={(e) => handleUpdateHomeownerDetails("clientEmail", e.target.value)}
                      className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/40 rounded-lg p-2 text-xs text-[#191c1e] focus:bg-white focus:border-[#eab308] outline-none transition-all font-medium print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold"
                      placeholder="Correo electrónico"
                    />
                  </div>
                </div>
              </div>

              {/* Item List Table Card */}
              <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#eceef0] flex items-center justify-between no-print">
                  <h2 className="font-sans text-xs font-bold text-[#131b2e]">Desglose de Conceptos de Construcción</h2>
                  <button
                    onClick={() => setIsAddingItem(!isAddingItem)}
                    className="text-xs text-[#ca8a04] font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Concepto
                  </button>
                </div>

                {isAddingItem && (
                  <form onSubmit={handleAddItem} className="no-print p-4 bg-[#f7f9fb] border-b border-[#eceef0] grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
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
                        className="flex-1 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-1.5 bg-[#eab308] text-slate-900 font-bold text-xs rounded-lg shadow-sm btn-gold-3d"
                      >
                        Añadir
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
                        <th className="py-3 px-4 text-center no-print">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eceef0]">
                      {activeEstimate.items.map((item) => (
                        <tr key={item.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-medium">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[#191c1e] block">{item.description}</span>
                              <span className="text-[10px] text-[#7c839b] font-mono uppercase bg-[#eceef0] px-1.5 py-0.5 rounded w-max block print:hidden">{item.category}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-semibold">
                            <span className="hidden print:inline">{item.qty}</span>
                            <input 
                              type="number" 
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(item.id, Number(e.target.value), item.unitPrice)}
                              className="no-print w-16 bg-[#f7f9fb] border border-[#c6c6cd]/50 rounded p-1 text-center font-semibold text-xs"
                            />
                          </td>
                          <td className="py-4 px-4 text-center text-[#7c839b] font-medium">{item.unit}</td>
                          <td className="py-4 px-4 text-right font-medium">
                            <span className="hidden print:inline">${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            <div className="no-print flex items-center justify-end gap-1">
                              <span className="text-[#7c839b] font-medium">$</span>
                              <input 
                                type="number" 
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(item.id, item.qty, Number(e.target.value))}
                                className="w-20 bg-[#f7f9fb] border border-[#c6c6cd]/50 rounded p-1 text-right font-semibold text-xs"
                              />
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-[#131b2e]">${item.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 text-center no-print">
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
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
                    <FileText className="w-4 h-4 text-[#ca8a04] print:hidden" />
                    <span>Contrato Digital & Términos de Servicio</span>
                  </div>
                  <p className="text-[11px] text-[#7c839b] leading-relaxed">
                    Se requiere la firma del cliente en el contrato digital para iniciar la producción de techado. El propietario pagará el monto acordado según las condiciones del contrato final.
                  </p>
                  <label className="flex items-center gap-2.5 cursor-pointer p-2 bg-[#f7f9fb] rounded-lg border border-[#c6c6cd]/20 print:border-none print:bg-transparent print:p-0">
                    <input 
                      type="checkbox" 
                      checked={includeWarranty} 
                      onChange={() => setIncludeWarranty(!includeWarranty)}
                      className="rounded text-[#ca8a04] focus:ring-[#eab308] print:hidden"
                    />
                    <span className="text-xs font-semibold text-[#191c1e]">Incluir adenda de garantía estándar (10 años mano de obra)</span>
                  </label>
                </div>

                {/* Totals and Profit Margin widget */}
                <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-sans text-xs font-bold text-[#131b2e]">Resumen de Cierre de Cotización</h3>
                    <span className="font-sans text-[11px] text-[#7c839b] font-medium">Valores en USD</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#7c839b]">Subtotal Materiales:</span>
                      <span className="font-mono font-bold text-[#45464d]">${activeEstimate.subtotalMaterials.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7c839b]">Subtotal Mano de Obra:</span>
                      <span className="font-mono font-bold text-[#45464d]">${activeEstimate.subtotalLabor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7c839b]">Permisos y Tasas Administrativas:</span>
                      <span className="font-mono font-bold text-[#45464d]">${activeEstimate.subtotalFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-[#131b2e]">
                      <span>Subtotal Bruto:</span>
                      <span className="font-mono">${activeEstimate.subtotalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[#7c839b]">
                      <span>Impuestos ({(activeEstimate.taxRate * 100).toFixed(2)}%):</span>
                      <span className="font-mono">${activeEstimate.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg text-[#131b2e]">
                      <span>Total Estimado:</span>
                      <span className="font-mono">${activeEstimate.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Margen de Beneficio indicator (Hidden in print mode for HO privacy!) */}
                  <div className="bg-[#f7f9fb] border border-[#c6c6cd]/30 rounded-xl p-4 no-print">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-[#45464d] flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-[#ca8a04]" />
                        <span>Margen de Beneficio Estimado</span>
                      </span>
                      <span className={`font-mono font-bold text-xs ${isMarginUnderStandard ? "text-amber-600" : "text-yellow-600"}`}>
                        {activeEstimate.profitMargin}%
                      </span>
                    </div>
                    <div className="w-full bg-[#eceef0] rounded-full h-2 overflow-hidden mb-3">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${isMarginUnderStandard ? "bg-amber-500" : "bg-[#eab308]"}`} 
                        style={{ width: `${Math.min(100, (activeEstimate.profitMargin / 50) * 100)}%` }}
                      ></div>
                    </div>

                    {isMarginUnderStandard && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-amber-50/60 p-2.5 border border-amber-100 rounded-lg">
                        <p className="text-[10px] text-amber-800 font-semibold leading-tight flex-1">
                          El margen proyectado es inferior al estándar mínimo (30%).
                        </p>
                        <button
                          type="button"
                          onClick={handleAutoAdjustMargin}
                          className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 active:scale-95 transition-all shadow-sm shrink-0"
                        >
                          Auto-ajustar al 30%
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PDF Print Signature lines (Only visible on print/PDF) */}
              <div className="hidden print:grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-gray-300">
                <div className="space-y-8">
                  <p className="text-xs text-gray-500 font-medium">Aprobado por el Cliente (Propietario):</p>
                  <div className="border-b border-gray-400 h-8 w-2/3"></div>
                  <p className="text-[10px] text-slate-500">Firma / Fecha</p>
                </div>
                <div className="space-y-8 text-right flex flex-col items-end">
                  <p className="text-xs text-gray-500 font-medium">Representante Autorizado (Xapcon Group):</p>
                  <div className="border-b border-gray-400 h-8 w-2/3"></div>
                  <p className="text-[10px] text-slate-500">Firma / Fecha</p>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Modal: New Estimate Lead Registration */}
      {isAddingLead && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-150 animate-fade-in select-none">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#ca8a04]" />
                <h3 className="font-bold text-sm text-[#131b2e]">Nueva Cotización Retail</h3>
              </div>
              <button 
                onClick={() => setIsAddingLead(false)}
                className="text-[#7c839b] hover:text-red-500 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#7c839b] uppercase tracking-wider mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#eab308] font-medium"
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#7c839b] uppercase tracking-wider mb-1">Dirección de la Propiedad</label>
                <input 
                  type="text" 
                  value={newLeadAddress}
                  onChange={(e) => setNewLeadAddress(e.target.value)}
                  className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#eab308] font-medium"
                  placeholder="Calle, Ciudad, Estado, Zip"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#7c839b] uppercase tracking-wider mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#eab308] font-medium"
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#7c839b] uppercase tracking-wider mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full bg-[#f7f9fb] border border-[#c6c6cd]/60 rounded-lg py-2 px-3 text-xs outline-none focus:bg-white focus:border-[#eab308] font-medium"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddingLead(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg transition-colors shadow-sm btn-gold-3d"
                >
                  Crear Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {showToast && (
        <div className="no-print fixed bottom-6 right-6 bg-[#131b2e] border border-emerald-500 text-white rounded-xl p-4 shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-100">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
