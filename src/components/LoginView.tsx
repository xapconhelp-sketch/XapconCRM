import React, { useState } from "react";
import logoXapcon from "../LogoXapcon.png";
import windDamageImg from "../Winddamage.jpg";

interface LoginViewProps {
  onLogin: () => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("479roofing@gmail.com");
  const [rememberEmail, setRememberEmail] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#131b2e] font-sans antialiased overflow-hidden select-none">
      
      {/* Left Column: Dark Panel Form */}
      <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-[#172033] border-r border-white/5 z-10 shadow-2xl">
        
        {/* Top Branding Logo */}
        <div className="flex flex-col items-center">
          <div className="w-full bg-white/95 p-4 rounded-2xl flex items-center justify-center shadow-md border border-white/10 hover:bg-white transition-colors duration-200">
            <img 
              src={logoXapcon} 
              alt="Xapcon Group Logo" 
              className="h-16 md:h-20 w-auto object-contain"
            />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#7c839b] mt-3 font-semibold">
            Enterprise Management CRM
          </span>
        </div>

        {/* Center Form */}
        <form onSubmit={handleSubmit} className="my-auto py-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-[26px] font-bold text-white tracking-tight">Sign In</h2>
          </div>

          <div className="space-y-5">
            {/* Custom styled input with bottom border only */}
            <div className="relative border-b border-white/20 focus-within:border-[#6cf8bb] transition-all py-1.5">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-[#7c839b] mb-1">
                Email
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder-white/20 select-text py-0.5"
              />
            </div>

            {/* Custom Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer group text-xs text-[#a3aabf] font-medium py-1">
              <input 
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                rememberEmail 
                  ? "bg-[#0ea5e9] border-[#0ea5e9] text-white" 
                  : "border-white/30 group-hover:border-white/50"
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

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-2">
            <button 
              type="button"
              onClick={onLogin}
              className="flex-1 py-2 px-4 border border-white/30 hover:border-white/60 hover:bg-white/5 text-white text-xs font-bold rounded-md transition-all active:scale-[0.98]"
            >
              Create account
            </button>
            <button 
              type="submit"
              className="flex-1 py-2 px-4 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold rounded-md shadow-lg shadow-[#0ea5e9]/10 transition-all active:scale-[0.98]"
            >
              NEXT
            </button>
          </div>
        </form>

        {/* Bottom Footer */}
        <div className="space-y-5 text-[11px]">
          {/* Custom Language selector matching screenshot */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-white font-medium w-fit cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-sm">🇺🇸</span>
            <span>English (United States)</span>
            <svg className="w-3.5 h-3.5 text-[#7c839b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Disclaimer copy */}
          <p className="text-[#7c839b] leading-relaxed">
            By signing in you accept Xapcon's{" "}
            <a href="#" className="text-[#0ea5e9] hover:underline">License Agreement</a>
            {" "}and{" "}
            <a href="#" className="text-[#0ea5e9] hover:underline">Privacy Policy</a>.
          </p>
        </div>

      </div>

      {/* Right Column: Full screen image */}
      <div className="hidden lg:block flex-1 relative h-screen">
        <img 
          src={windDamageImg} 
          alt="Roofing Damage Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Soft dark overlay matching portal theme */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#131b2e]/60 via-transparent to-transparent"></div>
      </div>

    </div>
  );
}
