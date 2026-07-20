import React, { useState } from "react";
import logoXapcon from "../../LogoXapcon.png";
import windDamageImg from "../../Winddamage.jpg";
import { supabase } from "../lib/supabase";

export default function LoginView() {
  const [activeTab, setActiveTab] = useState<"admin" | "contractor">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Self-registration states for Contractor (Owner vs Colaborador)
  const [isRegistering, setIsRegistering] = useState(false);
  const [regType, setRegType] = useState<"owner" | "employee">("owner");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regRole, setRegRole] = useState("Vendedor");
  const [regCompanyId, setRegCompanyId] = useState("");
  const [regSuccessText, setRegSuccessText] = useState<string | null>(null);

  // Real-time validation states
  const [companyValidating, setCompanyValidating] = useState(false);
  const [companyNameValidated, setCompanyNameValidated] = useState<string | null>(null);
  const [companyValidationError, setCompanyValidationError] = useState<string | null>(null);

  const handleTabChange = (tab: "admin" | "contractor") => {
    setActiveTab(tab);
    setErrorText(null);
    setIsRegistering(false);
    setRegSuccessText(null);
  };

  const handleCompanyCodeChange = async (code: string) => {
    setRegCompanyId(code);
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length >= 7) {
      setCompanyValidating(true);
      setCompanyValidationError(null);
      setCompanyNameValidated(null);
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, company_name')
          .eq('invite_code', cleanCode)
          .single();

        if (error || !data) {
          setCompanyValidationError("Código de empresa no encontrado");
        } else {
          setCompanyNameValidated(data.company_name || data.name);
        }
      } catch (err) {
        setCompanyValidationError("Error al validar código");
      } finally {
        setCompanyValidating(false);
      }
    } else {
      setCompanyNameValidated(null);
      setCompanyValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setIsLoading(true);
    
    if (email.trim() && password.trim()) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorText(error.message);
      }
    }
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setRegSuccessText(null);
    setIsLoading(true);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorText("Por favor completa todos los campos requeridos.");
      setIsLoading(false);
      return;
    }

    let metaData: any = {
      fullName: regName.trim(),
    };

    if (regType === "owner") {
      if (!regCompanyName.trim()) {
        setErrorText("Por favor introduce el nombre de tu empresa.");
        setIsLoading(false);
        return;
      }
      metaData = {
        ...metaData,
        role: "Dueño",
        isOwner: true,
        companyName: regCompanyName.trim(),
        companyCode: null
      };
    } else {
      if (!regCompanyId.trim()) {
        setErrorText("Por favor introduce el código de invitación.");
        setIsLoading(false);
        return;
      }
      if (companyValidationError || !companyNameValidated) {
        setErrorText(companyValidationError || "Código de empresa no válido o no verificado.");
        setIsLoading(false);
        return;
      }
      metaData = {
        ...metaData,
        role: regRole,
        isOwner: false,
        companyName: null,
        companyCode: regCompanyId.trim().toUpperCase()
      };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: {
        data: metaData
      }
    });

    if (authError) {
      setErrorText(authError.message);
      setIsLoading(false);
      return;
    }

    if (authData.user) {
      if (regType === "owner") {
        setRegSuccessText(`Cuenta de Dueño creada. Tu empresa "${regCompanyName}" se registrará automáticamente al iniciar sesión.`);
      } else {
        setRegSuccessText(`Cuenta creada. Te vincularás automáticamente a "${companyNameValidated}" al iniciar sesión.`);
      }
      // Limpiar campos
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegCompanyName("");
      setRegCompanyId("");
      setCompanyNameValidated(null);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#131b2e] font-sans antialiased overflow-hidden select-none">
      
      {/* Left Column: Soft Gray Panel Form */}
      <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-[#f4f6f9] border-r border-gray-200 z-10 shadow-2xl overflow-y-auto">
        
        {/* Top Branding Logo */}
        <div className="flex flex-col items-center">
          <img 
            src={logoXapcon} 
            alt="Xapcon Group Logo" 
            className="h-44 md:h-52 w-auto object-contain"
          />
        </div>

        {/* Center area */}
        {!isRegistering ? (
          <form onSubmit={handleSubmit} className="my-auto py-6 space-y-6">
            <div className="flex bg-gray-200/60 border border-gray-200/40 rounded-lg p-1 w-full text-xs font-bold text-[#7c839b] mb-4">
              <button
                type="button"
                onClick={() => handleTabChange("admin")}
                className={`flex-1 text-center py-1.5 rounded-md transition-all ${
                  activeTab === "admin"
                    ? "bg-white text-[#131b2e] shadow-sm font-bold"
                    : "hover:text-[#131b2e]"
                }`}
              >
                Colaboradores (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("contractor")}
                className={`flex-1 text-center py-1.5 rounded-md transition-all ${
                  activeTab === "contractor"
                    ? "bg-white text-[#131b2e] shadow-sm font-bold"
                    : "hover:text-[#131b2e]"
                }`}
              >
                Contratistas
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-[26px] font-bold text-[#131b2e] tracking-tight">Sign In</h2>
              <p className="text-xs text-[#7c839b] font-medium">
                {activeTab === "admin" 
                  ? "Acceso multi-empresa para colaboradores internos." 
                  : "Acceso seguro para contratistas vinculados."}
              </p>
            </div>

            {errorText && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 animate-shake">
                ⚠️ {errorText}
              </div>
            )}

            <div className="space-y-5">
              <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1.5">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#7c839b] mb-1">
                  Email
                </label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full bg-transparent border-none text-sm text-[#191c1e] focus:outline-none placeholder-gray-400 select-text py-0.5"
                />
              </div>

              <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1.5">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#7c839b] mb-1">
                  Password
                </label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent border-none text-sm text-[#191c1e] focus:outline-none placeholder-gray-400 select-text py-0.5"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer group text-xs text-[#45464d] font-medium py-1">
                <input 
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  rememberEmail 
                    ? "bg-[#0ea5e9] border-[#0ea5e9] text-white" 
                    : "border-gray-300 group-hover:border-gray-400"
                }`}>
                  {rememberEmail && (
                    <svg className="w-2.5 h-2.5 stroke-2 stroke-current fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span>Remember email</span>
              </label>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button 
                type="button"
                onClick={() => {
                  if (activeTab === "admin") {
                    setErrorText("El registro de administradores se realiza por invitación directa de Xapcon.");
                  } else {
                    setIsRegistering(true);
                    setErrorText(null);
                  }
                }}
                className="flex-1 py-2 px-4 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-md transition-all active:scale-[0.98]"
              >
                Create account
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold rounded-md shadow-lg shadow-[#0ea5e9]/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? "Cargando..." : "NEXT"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="my-auto py-4 space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-[22px] font-bold text-[#131b2e] tracking-tight">Registro de Contratista</h2>
              <p className="text-xs text-[#7c839b] font-medium">Configura tu nueva empresa o únete a una existente.</p>
            </div>

            <div className="flex bg-gray-200/60 border border-gray-200/40 rounded-lg p-1 w-full text-xs font-bold text-[#7c839b] mb-2">
              <button
                type="button"
                onClick={() => {
                  setRegType("owner");
                  setErrorText(null);
                }}
                className={`flex-1 text-center py-1.5 rounded-md transition-all ${
                  regType === "owner"
                    ? "bg-white text-[#131b2e] shadow-sm font-bold"
                    : "hover:text-[#131b2e]"
                }`}
              >
                Dueño (Crear Empresa)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegType("employee");
                  setErrorText(null);
                }}
                className={`flex-1 text-center py-1.5 rounded-md transition-all ${
                  regType === "employee"
                    ? "bg-white text-[#131b2e] shadow-sm font-bold"
                    : "hover:text-[#131b2e]"
                }`}
              >
                Colaborador
              </button>
            </div>

            {errorText && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 animate-shake">
                ⚠️ {errorText}
              </div>
            )}

            {regSuccessText && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-bold text-[#ca8a04]">
                ✓ {regSuccessText}
              </div>
            )}

            <div className="space-y-3.5">
              <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1">
                <label className="block text-[9px] uppercase tracking-wider font-bold text-[#7c839b] mb-0.5">
                  Nombre Completo
                </label>
                <input 
                  type="text" 
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Carlos Ortega"
                  className="w-full bg-transparent border-none text-xs text-[#191c1e] focus:outline-none placeholder-gray-400 py-0.5"
                />
              </div>

              <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1">
                <label className="block text-[9px] uppercase tracking-wider font-bold text-[#7c839b] mb-0.5">
                  Correo Electrónico
                </label>
                <input 
                  type="email" 
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full bg-transparent border-none text-xs text-[#191c1e] focus:outline-none placeholder-gray-400 py-0.5"
                />
              </div>

              <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1">
                <label className="block text-[9px] uppercase tracking-wider font-bold text-[#7c839b] mb-0.5">
                  Contraseña
                </label>
                <input 
                  type="password" 
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-transparent border-none text-xs text-[#191c1e] focus:outline-none placeholder-gray-400 py-0.5"
                />
              </div>

              {regType === "owner" ? (
                <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1">
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-[#7c839b] mb-0.5">
                    Nombre de la Empresa
                  </label>
                  <input 
                    type="text" 
                    required
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="Ej: Xapcon Roofing LLC"
                    className="w-full bg-transparent border-none text-xs text-[#191c1e] focus:outline-none placeholder-gray-400 py-0.5"
                  />
                </div>
              ) : (
                <>
                  <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1">
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-[#7c839b] mb-0.5">
                      Rol / Cargo
                    </label>
                    <select 
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-[#191c1e] focus:outline-none py-0.5 cursor-pointer font-semibold"
                    >
                      <option value="Vendedor">Vendedor</option>
                      <option value="Gerente de Ventas">Gerente de Ventas</option>
                      <option value="Contador">Contador</option>
                      <option value="Colaborador">Colaborador</option>
                    </select>
                  </div>

                  <div className="relative border-b border-gray-200 focus-within:border-[#0ea5e9] transition-all py-1">
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-[#7c839b] mb-0.5">
                      Código de Invitación de la Empresa (XAP-XXXXXX)
                    </label>
                    <input 
                      type="text" 
                      required
                      value={regCompanyId}
                      onChange={(e) => handleCompanyCodeChange(e.target.value)}
                      placeholder="Ej: XAP-F38D9A"
                      className="w-full bg-transparent border-none text-xs text-[#191c1e] focus:outline-none placeholder-gray-400 py-0.5 uppercase tracking-wide font-mono"
                    />
                    {companyValidating && (
                      <span className="text-[10px] text-gray-500 block mt-1 animate-pulse">✓ Validando código...</span>
                    )}
                    {companyNameValidated && (
                      <span className="text-[10px] text-yellow-600 block mt-1 font-semibold">✓ Te unirás a: {companyNameValidated}</span>
                    )}
                    {companyValidationError && (
                      <span className="text-[10px] text-red-500 block mt-1 font-semibold">❌ {companyValidationError}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setErrorText(null);
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all"
              >
                Volver
              </button>
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#0ea5e9]/10 disabled:opacity-50"
              >
                {isLoading ? "Cargando..." : "Registrarse"}
              </button>
            </div>
          </form>
        )}

        <div className="text-[11px]">
          <p className="text-[#7c839b] leading-relaxed">
            By signing in you accept Xapcon's{" "}
            <a href="#" className="text-[#0ea5e9] hover:underline">License Agreement</a>
            {" "}and{" "}
            <a href="#" className="text-[#0ea5e9] hover:underline">Privacy Policy</a>.
          </p>
        </div>

      </div>

      <div className="hidden lg:block flex-1 relative h-screen">
        <img 
          src={windDamageImg} 
          alt="Roofing Damage Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#131b2e]/60 via-transparent to-transparent"></div>
      </div>
    </div>
  );
}
