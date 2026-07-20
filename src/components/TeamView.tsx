import React, { useState, useEffect } from "react";
import { TeamMember } from "../types";
import { 
  Users2, 
  Search, 
  MapPin, 
  CheckCircle2, 
  Mail, 
  Phone,
  Filter,
  UserCheck,
  Plus
} from "lucide-react";

interface TeamViewProps {
  members: TeamMember[];
  onAddMember?: (member: Omit<TeamMember, "id" | "avatar" | "status">) => void;
  onUpdateMember?: (id: string, data: { name: string; phone: string; address: string; avatarFile?: File; companyName?: string; organizationId?: string }) => Promise<boolean>;
  userRole?: "admin" | "contractor";
  organizations?: { id: string; name: string }[];
  userCompany?: string;
  companyInviteCode?: string;
}

export default function TeamView({ 
  members, 
  onAddMember, 
  onUpdateMember,
  userRole = "admin", 
  organizations = [], 
  userCompany = "",
  companyInviteCode = ""
}: TeamViewProps) {
  const [filterRole, setFilterRole] = useState<"all" | "sales" | "pm" | "install" | "admin" | "contractor">("all");
  
  // Registration form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleCategory, setRoleCategory] = useState<"sales" | "pm" | "install" | "admin" | "contractor">("sales");
  const [customRoleText, setCustomRoleText] = useState("");
  const [company, setCompany] = useState("");

  // Edit form state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = (m: TeamMember) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditCompany(m.company || "");
    setEditPhone(m.phone || "");
    setEditAddress((m as any).address || "");
    setEditAvatarFile(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !onUpdateMember) return;
    setIsSaving(true);
    const success = await onUpdateMember(editingMember.id, {
      name: editName,
      phone: editPhone,
      address: editAddress,
      avatarFile: editAvatarFile || undefined,
      companyName: editingMember.roleCategory === "contractor" ? editCompany : undefined,
      organizationId: (editingMember as any).organizationId || undefined
    });
    setIsSaving(false);
    if (success) {
      setEditingMember(null);
    }
  };

  useEffect(() => {
    if (userRole === "contractor") {
      setCompany(userCompany);
    } else if (organizations.length > 0 && !company) {
      setCompany(organizations[0].name);
    }
  }, [userCompany, organizations, userRole]);

  const filteredMembers = filterRole === "all" 
    ? members 
    : members.filter((m) => m.roleCategory === filterRole);

  const filters = userRole === "contractor" ? [
    { id: "all", label: "Todo el Personal" },
    { id: "sales", label: "Asesores de Venta" },
    { id: "pm", label: "Project Managers" },
    { id: "install", label: "Equipos de Instalación" }
  ] : [
    { id: "all", label: "Todo el Personal" },
    { id: "admin", label: "Colaboradores (Admin)" },
    { id: "sales", label: "Asesores de Venta" },
    { id: "pm", label: "Project Managers" },
    { id: "install", label: "Equipos de Instalación" },
    { id: "contractor", label: "Contratistas Externos" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !onAddMember) return;

    // Resolve final text role
    let roleText = "";
    if (roleCategory === "sales") roleText = customRoleText || "Asesor Comercial";
    else if (roleCategory === "pm") roleText = customRoleText || "Project Manager";
    else if (roleCategory === "install") roleText = customRoleText || "Director de Cuadrilla";
    else if (roleCategory === "admin") roleText = customRoleText || "Administrador del Sistema";
    else if (roleCategory === "contractor") roleText = `Contratista de ${company}`;

    onAddMember({
      name,
      email,
      phone: phone || "(555) 000-0000",
      roleCategory,
      role: roleText,
      company: roleCategory === "contractor" ? company : (userRole === "contractor" ? userCompany : company)
    });

    // Reset fields
    setName("");
    setEmail("");
    setPhone("");
    setCustomRoleText("");
    setShowAddForm(false);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Personal & Cuadrillas</h1>
            {userRole === "contractor" && companyInviteCode && (
              <span className="px-2.5 py-1 bg-[#fff8e1] border border-[#ffecb3] text-[#ca8a04] text-xs font-mono font-bold rounded-lg shadow-sm">
                Código de Invitación: {companyInviteCode}
              </span>
            )}
          </div>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Directorio interno de asesores de ventas, directores de obra y contratistas externos.</p>
        </div>
        
        {onAddMember && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-gold-3d flex items-center gap-1.5 px-4 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Invitación de Usuario</span>
          </button>
        )}
      </div>

      {/* Expandable Invitation Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <UserCheck className="w-4.5 h-4.5 text-[#eab308]" />
            <h2 className="text-sm font-bold text-[#131b2e]">Registrar Nuevo Usuario / Invitar Socio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nombre */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Nombre Completo</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Juan Pérez"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
              />
            </div>
            {/* Correo */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Email</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="juan@ejemplo.com"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
              />
            </div>
            {/* Teléfono */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Teléfono (Opcional)</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="(555) 123-4567"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo de Rol */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Rol del Usuario</label>
              {userRole === "contractor" ? (
                <select 
                  value={roleCategory} 
                  onChange={(e) => setRoleCategory(e.target.value as any)} 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#eab308]"
                >
                  <option value="sales">Asesor Comercial (Ventas)</option>
                  <option value="pm">Project Manager</option>
                  <option value="install">Equipo de Instalación (Crews)</option>
                </select>
              ) : (
                <select 
                  value={roleCategory} 
                  onChange={(e) => setRoleCategory(e.target.value as any)} 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#eab308]"
                >
                  <option value="sales">Asesor Comercial (Ventas)</option>
                  <option value="pm">Project Manager</option>
                  <option value="install">Equipo de Instalación (Crews)</option>
                  <option value="admin">Colaborador (Admin Global)</option>
                  <option value="contractor">Contratista Externo (Empresa)</option>
                </select>
              )}
            </div>

            {/* Si es Contratista y es Super Admin, seleccionar empresa vinculada */}
            {userRole === "admin" && roleCategory === "contractor" ? (
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Empresa Asignada</label>
                <select 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#eab308]"
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.name}>{org.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              /* Custom Role Text */
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Título de Cargo (Personalizado)</label>
                <input 
                  type="text" 
                  value={customRoleText} 
                  onChange={(e) => setCustomRoleText(e.target.value)} 
                  placeholder="Ej: Auditor de Calidad"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#eab308]"
                />
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-end gap-2">
              <button 
                type="submit" 
                className="btn-gold-3d w-full py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-xs font-bold rounded-lg transition-all"
              >
                Registrar e Invitar
              </button>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 select-none">
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm text-center">
          <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Miembros Registrados</span>
          <span className="text-2xl font-bold text-[#131b2e] block mt-1">{members.length} Cuentas</span>
          <span className="text-[10px] text-yellow-600 font-bold block mt-0.5">● Portal Activo</span>
        </div>
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm text-center">
          <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Tasa de Cierre Comercial</span>
          <span className="text-2xl font-bold text-[#131b2e] block mt-1">68% Promedio</span>
          <span className="text-[10px] text-yellow-600 font-bold block mt-0.5">+2.4% vs Trimestre anterior</span>
        </div>
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm text-center">
          <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Entregas a Tiempo</span>
          <span className="text-2xl font-bold text-[#131b2e] block mt-1">94% Global</span>
          <span className="text-[10px] text-teal-600 font-bold block mt-0.5">En 12 sitios de construcción</span>
        </div>
      </div>

      {/* Filter and Content Grid */}
      <div className="space-y-4">
        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eceef0] pb-3 select-none">
          <span className="text-xs font-bold text-[#45464d] mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar por Rol:
          </span>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterRole(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === f.id
                  ? "btn-gold-3d bg-[#eab308] shadow-sm font-bold"
                  : "bg-white border border-[#c6c6cd]/50 text-[#45464d] hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 select-none">
          {filteredMembers.map((m) => (
            <div 
              key={m.id} 
              className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl border border-[#c6c6cd]/40 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    <img 
                      src={m.avatar} 
                      alt={m.name} 
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="pt-1">
                    <h3 className="font-sans text-sm font-bold text-[#131b2e] leading-tight">{m.name}</h3>
                    <p className="font-sans text-xs text-[#7c839b] font-medium mt-0.5">{m.role}</p>
                    
                    {m.phone && m.phone !== "(555) 000-0000" && (
                      <p className="font-sans text-[11px] text-[#7c839b] font-medium mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {m.phone}
                      </p>
                    )}
                    {(m as any).address && (
                      <p className="font-sans text-[11px] text-[#7c839b] font-medium mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {(m as any).address}
                      </p>
                    )}

                  </div>
                </div>
                
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                  m.status === "Available" 
                    ? "bg-yellow-50 text-[#ca8a04] border border-yellow-200" 
                    : m.status === "Offline"
                    ? "bg-gray-100 text-gray-500 border border-gray-200"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {m.status === "Available" ? "Disponible" : m.status === "Offline" ? "Desconectado" : "En Sitio (Ocupado)"}
                </span>
              </div>

              {/* Statistics details */}
              <div className="bg-[#f7f9fb] border border-[#eceef0] rounded-xl p-3 text-xs grid grid-cols-2 gap-3">
                {m.roleCategory === "sales" && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Leads Asignados</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.activeLeads || 0} prospectos</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Cierre de Ventas</span>
                      <span className="font-sans font-bold text-yellow-600">{m.closeRate || 0}%</span>
                    </div>
                  </>
                )}

                {m.roleCategory === "pm" && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Proyectos en Curso</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.activeProjects || 0} obras</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Sitios Inspeccionados</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.sitesInspected || 0} esta semana</span>
                    </div>
                  </>
                )}

                {m.roleCategory === "install" && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Tamaño Cuadrilla</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.crewMembersCount || 0} operarios</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Entrega a Tiempo</span>
                      <span className="font-sans font-bold text-[#ca8a04]">{m.onTimeRate || 0}%</span>
                    </div>
                  </>
                )}

                {(m.roleCategory === "admin" || m.roleCategory === "contractor") && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Empresa</span>
                      <span className="font-sans font-bold text-sky-700 truncate block">{m.company || "Xapcon Admin"}</span>
                    </div>
                    <div>
                      {m.roleCategory === "contractor" && (m as any).companyInviteCode ? (
                        <>
                          <span className="text-[#7c839b] font-medium block text-[10px]">Código Empresa</span>
                          <span className="font-mono font-extrabold text-[13px] text-[#ca8a04] tracking-wide block mt-0.5">
                            {(m as any).companyInviteCode}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#7c839b] font-medium block text-[10px]">Acceso Portal</span>
                          <span className="font-sans font-bold text-yellow-600">Activo</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Contact button actions */}
              <div className="flex gap-2 pt-1 border-t border-[#eceef0]">
                <a 
                  href={`mailto:${m.email}`}
                  className="flex-1 py-1.5 bg-[#131b2e] hover:bg-[#252f46] text-[#eab308] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Enviar Correo</span>
                </a>
                
                {userRole === "admin" && onUpdateMember && (
                  <button 
                    onClick={() => openEditModal(m)}
                    className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1"
                  >
                    <span>Editar Perfil</span>
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal Overlay */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-[#eceef0] flex items-center justify-between bg-gray-50">
              <h2 className="text-sm font-bold text-[#131b2e]">Editar Información</h2>
              <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#7c839b]">
                  {editingMember.roleCategory === "contractor" ? "Nombre del Dueño / Representante" : "Nombre Completo"}
                </label>
                <input 
                  type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                />
              </div>

              {editingMember.roleCategory === "contractor" && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Nombre de la Empresa</label>
                  <input 
                    type="text" required value={editCompany} onChange={e => setEditCompany(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Teléfono</label>
                <input 
                  type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Dirección Física</label>
                <input 
                  type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]"
                />
              </div>

              <div className="space-y-1 pt-2">
                <label className="block text-[10px] uppercase font-bold text-[#7c839b]">Logo / Imagen de Perfil</label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-20 h-20 rounded-xl border border-gray-200 bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-sm">
                    <img src={editingMember.avatar} alt="Current" className="max-w-full max-h-full object-contain" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setEditAvatarFile(e.target.files ? e.target.files[0] : null)}
                    className="text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#eceef0] mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn-gold-3d flex-1 py-2 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
