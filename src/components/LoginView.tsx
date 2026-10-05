import React, { useState, useRef } from "react";
import logoXapcon from "../../LogoXapcon.png";
import windDamageImg from "../../Winddamage.jpg";
import { supabase } from "../lib/supabase";

export default function LoginView() {
  const [activeTab, setActiveTab] = useState<"admin" | "contractor">("admin");
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("xapcon_remembered_email") || ""; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const codeRequest = useRef(0);

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
    const request = ++codeRequest.current;
    setCompanyNameValidated(null);
    setCompanyValidationError(null);
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 7) { setCompanyValidating(false); return; }
    setCompanyValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_company_invite_code', { p_code: cleanCode }).maybeSingle();
      if (request !== codeRequest.current) return;
      if (error || !data) setCompanyValidationError('Código de empresa no encontrado');
      else {
        const company = data as { company_name?: string; name: string };
        setCompanyNameValidated(company.company_name || company.name);
      }
    } catch {
      if (request === codeRequest.current) setCompanyValidationError('No se pudo verificar el código. Intenta de nuevo.');
    } finally {
      if (request === codeRequest.current) setCompanyValidating(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email.trim()) { setErrorText('Escribe tu correo para recuperar la contraseña.'); return; }
    setIsLoading(true);
    setErrorText(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setLoginMessage('Si el correo tiene una cuenta, recibirás un enlace para cambiar tu contraseña.');
    } catch (error) { setErrorText((error as Error).message); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setIsLoading(true);

    setLoginMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      try {
        if (rememberEmail) localStorage.setItem('xapcon_remembered_email', email.trim());
        else localStorage.removeItem('xapcon_remembered_email');
      } catch { /* Browser storage can be disabled. */ }
    } catch (error) { setErrorText((error as Error).message); }
    finally { setIsLoading(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    setRegSuccessText(null);
    setIsLoading(true);

    try {
      if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
        setErrorText("Por favor completa todos los campos requeridos.");
        setIsLoading(false);
        return;
      }

      if (regPassword.length < 8) {
        setErrorText('La contraseña debe tener al menos 8 caracteres.');
        setIsLoading(false);
        return;
      }
      let metaData: Record<string, unknown> = {
        full_name: regName.trim(),
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
        // Revalidate the exact submitted value. The preview alone is not authority.
        const { data: company, error: codeError } = await supabase.rpc('validate_company_invite_code', {
          p_code: regCompanyId.trim().toUpperCase()
        }).maybeSingle();
        if (codeError || !company) {
          setErrorText('El código de empresa no es válido. Verifícalo e intenta de nuevo.');
          setIsLoading(false);
          return;
        }
        metaData = {
          ...metaData,
          role: regRole,
          jobTitle: regRole,
          isOwner: false,
          companyName: null,
          companyCode: regCompanyId.trim().toUpperCase()
        };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: metaData,
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        setErrorText(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        if (regType === "owner") {
          setRegSuccessText(`Solicitud de cuenta recibida. Revisa tu correo y confirma tu cuenta. Tu empresa y su código estarán disponibles al ingresar.`);
        } else {
          setRegSuccessText(`Solicitud de cuenta recibida. Revisa tu correo y confirma tu cuenta para ingresar a la empresa.`);
        }
        // Limpiar campos
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegCompanyName("");
        setRegCompanyId("");
        setCompanyNameValidated(null);
      }

    } catch (error) { setErrorText((error as Error).message || 'No se pudo crear la cuenta.'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="login-shell min-h-screen w-full flex font-sans antialiased overflow-hidden select-none">

      {/* Left Column: Soft Gray Panel Form */}
      <div className="login-panel w-full lg:w-[460px] xl:w-[500px] shrink-0 flex flex-col justify-between p-8 sm:p-12 md:p-16 border-r z-10 overflow-y-auto">

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
                    ? "bg-white text-[#17314A] shadow-sm font-bold"
                    : "hover:text-[#17314A]"
                }`}
              >
                Equipo Xapcon
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("contractor")}
                className={`flex-1 text-center py-1.5 rounded-md transition-all ${
                  activeTab === "contractor"
                    ? "bg-white text-[#17314A] shadow-sm font-bold"
                    : "hover:text-[#17314A]"
                }`}
              >
                Contratistas
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="font-bold text-[#17314A] tracking-tight">Inicia sesión</h2>
              <p className="text-xs text-[#7c839b] font-medium">
                {activeTab === "admin"
                  ? "Acceso por invitación para el equipo interno de Xapcon."
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
                <span>Recordar correo</span>
              </label>
            </div>

            {loginMessage && <p role="status" className="text-xs text-green-700">{loginMessage}</p>}
            <button type="button" disabled={isLoading} onClick={requestPasswordReset} className="text-xs font-semibold text-[#0284c7] hover:underline">Olvidé mi contraseña</button>
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
                Crear cuenta
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold rounded-md shadow-lg shadow-[#0ea5e9]/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? "Cargando..." : "Continuar"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="my-auto py-4 space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-[22px] font-bold text-[#17314A] tracking-tight">Registro de Contratista</h2>
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
                    ? "bg-white text-[#17314A] shadow-sm font-bold"
                    : "hover:text-[#17314A]"
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
                    ? "bg-white text-[#17314A] shadow-sm font-bold"
                    : "hover:text-[#17314A]"
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
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-bold text-[#955B32]">
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
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  autoComplete="new-password"
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
                      Código de Invitación de la Empresa (XAP-…)
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
            Al iniciar sesión, aceptas el{" "}
            <a href="#" className="text-[#B77A4B] hover:underline">Acuerdo de licencia</a>
            {" "}y la{" "}
            <a href="#" className="text-[#B77A4B] hover:underline">Política de privacidad</a>.
          </p>
        </div>

      </div>

      <div className="login-visual hidden lg:block flex-1 relative h-screen overflow-hidden">
        <img
          src={windDamageImg}
          alt="Roofing Damage Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#17314A]/60 via-transparent to-transparent"></div>
        <div className="absolute z-10 left-12 xl:left-20 bottom-16 max-w-xl text-white">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-white/75">
            <span className="h-px w-8 bg-[#d6a27e]" /> Xapcon Group
          </span>
          <h1 className="mt-5 text-4xl xl:text-5xl font-semibold leading-[1.12] tracking-tight">
            Cada proyecto,<br />bajo control.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-white/75">
            Una plataforma clara para coordinar equipos, expedientes y obras con confianza.
          </p>
        </div>
      </div>
    </div>
  );
}
