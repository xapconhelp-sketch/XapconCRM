import React, { useState } from "react";
import { MaterialItem } from "../types";
import globalMaterials from "../data/materials.json";
import { 
  Search, 
  FileSpreadsheet, 
  X
} from "lucide-react";

interface MaterialsCatalogModalProps {
  onClose: () => void;
}

export default function MaterialsCatalogModal({ onClose }: MaterialsCatalogModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const materials = globalMaterials as MaterialItem[];

  // Filter materials based on search term
  const filteredMaterials = materials.filter(m => 
    m.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.originalDescription && m.originalDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-slide-up flex flex-col h-[80vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#eceef0] flex items-center justify-between bg-[#f8fafc] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#131b2e] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#ca8a04]" />
              Lista de Precios de Referencia (Materiales & Mano de Obra)
            </h2>
            <p className="text-[10px] text-[#7c839b] font-medium mt-0.5">Catálogo global actualizado mensualmente por el administrador de la plataforma.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          
          {/* Stats and Search Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 uppercase tracking-wider">
                Total: {materials.length} Conceptos
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Buscar material o trabajo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#f7f9fb] border border-[#c6c6cd]/50 rounded-xl text-xs text-[#131b2e] placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#eab308] focus:border-[#eab308] shadow-sm transition-all"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Materials Table Viewer */}
          <div className="flex-1 min-h-[250px] border border-[#c6c6cd]/30 rounded-xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider font-sans shrink-0 sticky top-0 z-10">
                    <th className="py-2.5 px-4 rounded-tl-lg">Descripción del Concepto</th>
                    <th className="py-2.5 px-4 text-center">Categoría</th>
                    <th className="py-2.5 px-4 text-center">Unidad</th>
                    <th className="py-2.5 px-4 text-right rounded-tr-lg">Precio Unitario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eceef0] text-xs">
                  {filteredMaterials.length > 0 ? (
                    filteredMaterials.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#191c1e]" title={item.description}>
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.category === "material" 
                              ? "bg-sky-50 text-sky-700 border border-sky-100" 
                              : item.category === "labor"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-purple-50 text-purple-700 border border-purple-100"
                          }`}>
                            {item.category === "material" ? "Material" : item.category === "labor" ? "Trabajo" : "Tasa"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-gray-500">
                          {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#131b2e]">
                          ${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">
                        No se encontraron materiales que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
