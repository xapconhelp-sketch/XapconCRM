import React, { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Palette,
  Save,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { Organization, UserProfile } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

type SettingsTab = "account" | "security" | "preferences" | "company";
type Density = "comfortable" | "compact";

interface BrandingForm {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
  registrationNumber: string;
  licenseNumber: string;
  primaryColor: string;
  accentColor: string;
  retailTaxPercent: string;
  retailDefaultFee: string;
  logoFile?: File;
}

interface SettingsViewProps {
  userRole: "admin" | "contractor";
  session: Session | null;
  profile: UserProfile | null;
  onProfileUpdated: (patch: Partial<UserProfile>) => void;
  activeOrganization: Organization | null;
  canEditCompany: boolean;
  onUpdateOrganizationBranding?: (organizationId: string, branding: BrandingForm) => Promise<boolean>;
}

const tabCopy: Record<SettingsTab, { title: string; description: string }> = {
  account: { title: "Mi cuenta", description: "Mantén actualizados los datos de la persona que utiliza Xapcon CRM." },
  security: { title: "Seguridad", description: "Protege el acceso a tu cuenta con una contraseña robusta." },
  preferences: { title: "Preferencias", description: "Ajusta la densidad visual de la aplicación en este dispositivo." },
  company: { title: "Identidad de empresa", description: "Administra los datos y la marca que aparecen en tus estimados PDF." }
};

const inputClass = "mt-1.5 w-full rounded-xl border border-[#D8E0E6] bg-white px-3.5 py-3 text-sm text-[#17314A] outline-none transition focus:border-[#B77A4B] focus:ring-4 focus:ring-[#B77A4B]/10 disabled:bg-slate-50 disabled:text-slate-500";
const labelClass = "block text-[11px] font-bold uppercase tracking-[0.09em] text-[#718096]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={labelClass}>{label}{children}</label>;
}

export default function SettingsView({
  userRole,
  session,
  profile,
  onProfileUpdated,
  activeOrganization,
  canEditCompany,
  onUpdateOrganizationBranding
}: SettingsViewProps) {
  const isContractor = userRole === "contractor";
  const tabs: SettingsTab[] = isContractor || activeOrganization ? ["account", "company", "security", "preferences"] : ["account", "security", "preferences"];
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [name, setName] = useState(profile?.full_name || "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [density, setDensity] = useState<Density>(() => {
    try {
      return localStorage.getItem(`xapcon_settings_density_${profile?.id || "guest"}`) === "compact" ? "compact" : "comfortable";
    } catch {
      return "comfortable";
    }
  });
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [branding, setBranding] = useState<BrandingForm>(() => ({
    companyName: activeOrganization?.company_name || activeOrganization?.name || "",
    companyEmail: activeOrganization?.company_email || "",
    companyPhone: activeOrganization?.company_phone || "",
    companyAddress: activeOrganization?.company_address || "",
    companyWebsite: activeOrganization?.company_website || "",
    registrationNumber: activeOrganization?.registration_number || "",
    licenseNumber: activeOrganization?.license_number || "",
    primaryColor: activeOrganization?.brand_primary_color || "#17314A",
    accentColor: activeOrganization?.brand_accent_color || "#B77A4B",
    retailTaxPercent: String(Number(activeOrganization?.retail_tax_rate ?? 0.0825) * 100),
    retailDefaultFee: String(activeOrganization?.retail_default_fee ?? 0)
  }));
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState("");

  useEffect(() => {
    setName(profile?.full_name || "");
    setJobTitle(profile?.job_title || "");
  }, [profile?.id, profile?.full_name, profile?.job_title]);

  useEffect(() => {
    setBranding({
      companyName: activeOrganization?.company_name || activeOrganization?.name || "",
      companyEmail: activeOrganization?.company_email || "",
      companyPhone: activeOrganization?.company_phone || "",
      companyAddress: activeOrganization?.company_address || "",
      companyWebsite: activeOrganization?.company_website || "",
      registrationNumber: activeOrganization?.registration_number || "",
      licenseNumber: activeOrganization?.license_number || "",
      primaryColor: activeOrganization?.brand_primary_color || "#17314A",
      accentColor: activeOrganization?.brand_accent_color || "#B77A4B",
      retailTaxPercent: String(Number(activeOrganization?.retail_tax_rate ?? 0.0825) * 100),
      retailDefaultFee: String(activeOrganization?.retail_default_fee ?? 0)
    });
    setBrandingMessage("");
  }, [activeOrganization?.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`xapcon_settings_density_${profile?.id || "guest"}`);
      setDensity(saved === "compact" ? "compact" : "comfortable");
    } catch {
      setDensity("comfortable");
    }
  }, [profile?.id]);

  useEffect(() => {
    document.documentElement.dataset.uiDensity = density;
  }, [density]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !name.trim()) return;
    setSavingProfile(true);
    setProfileMessage("");
    const patch = { full_name: name.trim(), job_title: jobTitle.trim() || null };
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      setProfileMessage(`No se pudo guardar el perfil: ${error.message}`);
      return;
    }
    onProfileUpdated(patch);
    if (session) {
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (metadataError) console.warn("No se pudo sincronizar el nombre en los metadatos de autenticación:", metadataError.message);
    }
    setProfileMessage("Datos de cuenta guardados.");
  };

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSecurityMessage("");
    if (password.length < 8) {
      setSecurityMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setSecurityMessage("Las contraseñas no coinciden.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      setSecurityMessage(`No se pudo actualizar la contraseña: ${error.message}`);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setSecurityMessage("Contraseña actualizada correctamente.");
  };

  const handleDensityChange = (nextDensity: Density) => {
    setDensity(nextDensity);
    setPreferencesMessage("");
    try {
      localStorage.setItem(`xapcon_settings_density_${profile?.id || "guest"}`, nextDensity);
      setPreferencesMessage("Preferencia guardada en este dispositivo.");
    } catch {
      setPreferencesMessage("No se pudo guardar la preferencia en este dispositivo.");
    }
  };

  const updateBranding = <K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) => {
    setBranding(previous => ({ ...previous, [key]: value }));
  };

  const handleSaveBranding = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOrganization || !canEditCompany || !onUpdateOrganizationBranding) return;
    if (branding.retailTaxPercent.trim() === '' || branding.retailDefaultFee.trim() === '' || !Number.isFinite(Number(branding.retailTaxPercent)) || Number(branding.retailTaxPercent) < 0 || Number(branding.retailTaxPercent) > 100 || !Number.isFinite(Number(branding.retailDefaultFee)) || Number(branding.retailDefaultFee) < 0) {
      setBrandingMessage('No se pudo guardar: revisa el impuesto y las tasas retail.');
      return;
    }
    setSavingBranding(true);
    setBrandingMessage("");
    const success = await onUpdateOrganizationBranding(activeOrganization.id, branding);
    setSavingBranding(false);
    setBrandingMessage(success ? "Identidad guardada. Se aplicará a los próximos PDFs." : "No se pudo guardar. Revisa los permisos e inténtalo de nuevo.");
    if (success) updateBranding("logoFile", undefined);
  };

  const selectedTab = tabs.includes(activeTab) ? activeTab : "account";
  const selectedCopy = tabCopy[selectedTab];

  return (
    <div className="settings-page flex-1 overflow-y-auto bg-[#F4F6F7] p-4 sm:p-6 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="settings-hero relative overflow-hidden rounded-[26px] bg-[#17314A] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-12 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-1 top-[-7.5rem] h-64 w-64 rounded-full border border-[#B77A4B]/40" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#E5B688]">
              <ShieldCheck className="h-3.5 w-3.5" /> Centro de control
            </span>
            <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight sm:text-[2.5rem]">Configuración</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D1DCE4]">
              {isContractor
                ? "Administra tu cuenta, la seguridad y la identidad que distingue a tu empresa en sus documentos."
                : "Administra tu acceso y tus preferencias personales para trabajar con Xapcon CRM."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7">
          <aside className="h-fit rounded-2xl border border-[#E2E8EC] bg-white p-3 shadow-sm">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A98A4]">Tu espacio</p>
            <nav aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto lg:flex-col">
              {tabs.map(tab => {
                const Icon = tab === "account" ? UserRound : tab === "security" ? LockKeyhole : tab === "preferences" ? Palette : Building2;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-current={selectedTab === tab ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors lg:w-full ${selectedTab === tab ? "bg-[#17314A] text-white shadow-sm" : "text-[#526574] hover:bg-[#F4F6F7] hover:text-[#17314A]"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tabCopy[tab].title}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 hidden rounded-xl border border-[#E7ECEF] bg-[#F8FAFB] p-3 lg:block">
              <div className="flex items-center gap-2 text-xs font-bold text-[#17314A]"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Cuenta protegida</div>
              <p className="mt-1.5 text-[11px] leading-5 text-[#718096]">Tus datos se guardan con el acceso autenticado de tu cuenta.</p>
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-[#E2E8EC] bg-white shadow-sm">
            <div className="border-b border-[#EDF1F3] px-5 py-5 sm:px-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B77A4B]">{isContractor ? "Cuenta de contratista" : "Cuenta de superadministrador"}</span>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#17314A]">{selectedCopy.title}</h2>
              <p className="mt-1 text-sm text-[#718096]">{selectedCopy.description}</p>
            </div>

            {selectedTab === "account" && (
              <form onSubmit={handleSaveProfile} className="space-y-6 px-5 py-6 sm:px-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nombre completo"><input required value={name} onChange={event => setName(event.target.value)} className={inputClass} autoComplete="name" /></Field>
                  <Field label="Correo de acceso"><input readOnly value={session?.user.email || profile?.email || ""} className={inputClass} /><span className="mt-1.5 block text-[11px] font-medium normal-case tracking-normal text-[#8A98A4]">El correo de acceso se administra desde la verificación de tu cuenta.</span></Field>
                  <Field label="Cargo o función"><input value={jobTitle} onChange={event => setJobTitle(event.target.value)} placeholder={isContractor ? "Propietario, ventas, operaciones…" : "Superadministrador"} className={inputClass} autoComplete="organization-title" /></Field>
                  <Field label="Tipo de cuenta"><input readOnly value={profile?.role === 'platform_staff' ? 'Colaborador Xapcon (acceso limitado)' : isContractor ? (profile?.role === 'owner' || profile?.role === 'Dueño' ? 'Propietario de empresa' : 'Colaborador de empresa') : 'Superadministrador'} className={inputClass} /></Field>
                </div>
                <div className="flex flex-col gap-3 border-t border-[#EDF1F3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[#718096]">Se actualizará tu perfil en la cuenta y el sistema.</p>
                  <div className="flex items-center gap-3">
                    {profileMessage && <span role="status" className={`text-xs font-semibold ${profileMessage.startsWith("No se pudo") ? "text-rose-600" : "text-emerald-700"}`}>{profileMessage}</span>}
                    <button disabled={savingProfile || !profile} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17314A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#244661] disabled:cursor-not-allowed disabled:opacity-50">
                      {savingProfile ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{savingProfile ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {selectedTab === "security" && (
              <form onSubmit={handleSavePassword} className="space-y-6 px-5 py-6 sm:px-8">
                <div className="max-w-2xl rounded-xl border border-[#E7ECEF] bg-[#F8FAFB] p-4">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17314A] text-white"><KeyRound className="h-4 w-4" /></span>
                    <div><h3 className="text-sm font-bold text-[#17314A]">Actualizar contraseña</h3><p className="mt-1 text-xs leading-5 text-[#718096]">Usa al menos 8 caracteres. El cambio se aplicará inmediatamente a tu inicio de sesión.</p></div>
                  </div>
                </div>
                <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
                  <Field label="Nueva contraseña"><div className="relative"><input required minLength={8} type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} className={`${inputClass} pr-12`} autoComplete="new-password" /><button type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 mt-[0.25rem] -translate-y-1/2 rounded-lg p-1 text-[#718096] hover:bg-slate-100">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>
                  <Field label="Confirmar contraseña"><input required minLength={8} type={showPassword ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClass} autoComplete="new-password" /></Field>
                </div>
                <div className="flex flex-col gap-3 border-t border-[#EDF1F3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  {securityMessage && <span role="status" className={`text-xs font-semibold ${securityMessage.startsWith("No se pudo") || securityMessage.includes("no coinciden") || securityMessage.includes("al menos") ? "text-rose-600" : "text-emerald-700"}`}>{securityMessage}</span>}
                  <button disabled={savingPassword || !password || !confirmPassword} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17314A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244661] disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto">
                    {savingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{savingPassword ? "Actualizando…" : "Actualizar contraseña"}
                  </button>
                </div>
              </form>
            )}

            {selectedTab === "preferences" && (
              <div className="space-y-6 px-5 py-6 sm:px-8">
                <div className="max-w-3xl">
                  <h3 className="text-sm font-bold text-[#17314A]">Densidad de la interfaz</h3>
                  <p className="mt-1 text-xs leading-5 text-[#718096]">Elige cuánto espacio vertical ocupan los controles. Esta preferencia se guarda en este dispositivo para tu usuario.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(["comfortable", "compact"] as Density[]).map(option => (
                      <button key={option} type="button" onClick={() => handleDensityChange(option)} aria-pressed={density === option} className={`rounded-xl border p-4 text-left transition ${density === option ? "border-[#B77A4B] bg-[#FCF8F4] ring-2 ring-[#B77A4B]/15" : "border-[#E2E8EC] hover:border-[#B8C4CC]"}`}>
                        <span className="flex items-center justify-between"><span className="text-sm font-bold text-[#17314A]">{option === "comfortable" ? "Cómoda" : "Compacta"}</span>{density === option && <Check className="h-4 w-4 text-[#A96535]" />}</span>
                        <span className="mt-1 block text-xs text-[#718096]">{option === "comfortable" ? "Más aire entre campos y secciones." : "Más información visible en pantalla."}</span>
                        <span className="mt-3 flex gap-1.5" aria-hidden="true"><i className="h-2 w-2 rounded-full bg-[#17314A]" /><i className={`h-2 w-2 rounded-full bg-[#B77A4B] ${option === "compact" ? "opacity-60" : "opacity-25"}`} /><i className={`h-2 w-2 rounded-full bg-[#CBD5DB] ${option === "compact" ? "opacity-50" : "opacity-25"}`} /></span>
                      </button>
                    ))}
                  </div>
                  {preferencesMessage && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{preferencesMessage}</p>}
                </div>
                <div className="border-t border-[#EDF1F3] pt-5">
                  <p className="text-xs font-semibold text-[#526574]">Idioma de la aplicación</p>
                  <p className="mt-1 text-xs text-[#8A98A4]">Español · El idioma disponible para tu cuenta en esta versión.</p>
                </div>
              </div>
            )}

            {selectedTab === "company" && (
              !activeOrganization ? (
                <div className="px-5 py-8 text-sm text-[#718096] sm:px-8">Tu cuenta aún no está vinculada a una empresa. Contacta al propietario de tu organización.</div>
              ) : !canEditCompany ? (
                <div className="flex items-start gap-3 px-5 py-8 sm:px-8"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ShieldCheck className="h-5 w-5" /></span><div><h3 className="text-sm font-bold text-[#17314A]">Acceso de solo lectura</h3><p className="mt-1 text-xs leading-5 text-[#718096]">Solo el propietario de la organización puede editar su identidad de marca y los datos fiscales.</p><p className="mt-3 text-xs font-semibold text-[#526574]">Organización: {activeOrganization.name}</p></div></div>
              ) : (
                <form onSubmit={handleSaveBranding} className="space-y-6 px-5 py-6 sm:px-8">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Nombre comercial"><input required value={branding.companyName} onChange={event => updateBranding("companyName", event.target.value)} className={inputClass} /></Field>
                    <Field label="Correo de empresa"><input type="email" value={branding.companyEmail} onChange={event => updateBranding("companyEmail", event.target.value)} placeholder="info@empresa.com" className={inputClass} /></Field>
                    <Field label="Teléfono de empresa"><input value={branding.companyPhone} onChange={event => updateBranding("companyPhone", event.target.value)} placeholder="(555) 123-4567" className={inputClass} /></Field>
                    <Field label="Sitio web"><input value={branding.companyWebsite} onChange={event => updateBranding("companyWebsite", event.target.value)} placeholder="www.empresa.com" className={inputClass} /></Field>
                    <Field label="Dirección comercial"><input value={branding.companyAddress} onChange={event => updateBranding("companyAddress", event.target.value)} placeholder="Dirección, ciudad, estado y código postal" className={inputClass} /></Field>
                    <Field label="Número de licencia"><input value={branding.licenseNumber} onChange={event => updateBranding("licenseNumber", event.target.value)} className={inputClass} /></Field>
                    <Field label="Número de registro"><input value={branding.registrationNumber} onChange={event => updateBranding("registrationNumber", event.target.value)} className={inputClass} /></Field>
                    <div><span className={labelClass}>Colores de marca</span><div className="mt-1.5 grid grid-cols-2 gap-3">{([['primaryColor', 'Principal'], ['accentColor', 'Acento']] as const).map(([key, title]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-[#D8E0E6] px-3 py-2"><input aria-label={`Color ${title.toLowerCase()}`} type="color" value={branding[key]} onChange={event => updateBranding(key, event.target.value)} className="h-8 w-9 cursor-pointer border-0 bg-transparent p-0" /><span><span className="block text-[10px] font-semibold text-[#718096]">{title}</span><span className="font-mono text-[11px] font-bold text-[#17314A]">{branding[key].toUpperCase()}</span></span></label>)}</div></div>
                  </div>
                  <fieldset className="rounded-xl border border-[#D8E0E6] p-4 space-y-3">
                    <legend className="px-2 text-xs font-bold text-[#17314A]">Valores predeterminados del estimador retail</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Impuesto (%)"><input required type="number" min="0" max="100" step="0.01" value={branding.retailTaxPercent} onChange={event => updateBranding('retailTaxPercent', event.target.value)} className={inputClass} /></Field>
                      <Field label="Permisos y tasas (USD)"><input required type="number" min="0" step="0.01" value={branding.retailDefaultFee} onChange={event => updateBranding('retailDefaultFee', event.target.value)} className={inputClass} /></Field>
                    </div>
                    <p className="text-xs font-normal normal-case tracking-normal text-[#718096]">Se aplican a nuevas cotizaciones. Las cotizaciones guardadas conservan sus valores.</p>
                  </fieldset>
                  <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#D8E0E6] bg-[#F8FAFB] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2E8EC] bg-white p-2">{branding.logoFile ? <span className="px-2 text-center text-[10px] font-semibold text-[#17314A]">{branding.logoFile.name}</span> : activeOrganization.logo_url ? <img src={activeOrganization.logo_url} alt="Logo actual de la empresa" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] font-semibold text-[#8A98A4]">Sin logo</span>}</div>
                      <Field label="Logo para cotizaciones"><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => updateBranding("logoFile", event.target.files?.[0] || undefined)} className="mt-1 block max-w-full text-xs font-medium normal-case tracking-normal text-[#526574] file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#17314A]" /><span className="mt-1 block text-[10px] font-medium normal-case tracking-normal">PNG, JPG, WEBP o SVG.</span></Field>
                    </div>
                    <button type="button" onClick={() => updateBranding("logoFile", undefined)} disabled={!branding.logoFile} className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#718096] hover:bg-white disabled:hidden"><X className="h-3.5 w-3.5" />Quitar selección</button>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-[#EDF1F3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#718096]">La identidad se aplicará a los próximos estimados PDF.</p>
                    <div className="flex items-center gap-3">{brandingMessage && <span role="status" className={`text-xs font-semibold ${brandingMessage.startsWith("No se pudo") ? "text-rose-600" : "text-emerald-700"}`}>{brandingMessage}</span>}<button disabled={savingBranding} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17314A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244661] disabled:opacity-50">{savingBranding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{savingBranding ? "Guardando…" : "Guardar identidad"}</button></div>
                  </div>
                </form>
              )
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
