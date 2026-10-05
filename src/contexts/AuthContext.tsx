import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  job_title?: string | null;
  avatar_url?: string;
  organization_id?: string | null;
  company_email?: string | null;
  company_website?: string | null;
  registration_number?: string | null;
  license_number?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  invite_code: string;
  is_internal?: boolean;
  membership_role?: string;
  company_name?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  company_website?: string | null;
  registration_number?: string | null;
  license_number?: string | null;
  logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_accent_color?: string | null;
  retail_tax_rate?: number;
  retail_default_fee?: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  organizations: Organization[];
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  activeOrganization: Organization | null;
  setActiveOrganization: (org: Organization | null) => void;
  signOut: () => Promise<void>;
  loading: boolean;
  accountError: string | null;
  retryAccount: () => Promise<void>;
  passwordRecovery: boolean;
  finishPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(() => {
    try {
      const saved = localStorage.getItem("crm_active_organization");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const accountRun = useRef(0);
  const currentUserId = useRef<string | null>(null);
  const accountReady = useRef(false);

  useEffect(() => {
    try {
      if (activeOrganization) {
        localStorage.setItem("crm_active_organization", JSON.stringify(activeOrganization));
      } else {
        localStorage.removeItem("crm_active_organization");
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeOrganization]);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const receiveSession = (nextSession: Session | null, refresh = false) => {
      if (!mounted) return;
      const nextId = nextSession?.user.id || null;
      setSession(nextSession);
      setUser(nextSession?.user || null);
      if (nextId === currentUserId.current) {
        if (refresh && nextId) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => { if (mounted) void fetchProfileData(nextId, true); }, 0);
        }
        return;
      }
      currentUserId.current = nextId;
      accountReady.current = false;
      accountRun.current++;
      setProfile(null);
      setOrganizations([]);
      setActiveOrganization(null);
      setAccountError(null);
      if (timer) clearTimeout(timer);
      if (nextId) {
        setLoading(true);
        // Supabase auth callbacks must return before starting another auth/API call.
        timer = setTimeout(() => { if (mounted) void fetchProfileData(nextId); }, 0);
      } else setLoading(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      receiveSession(nextSession, event === 'SIGNED_IN');
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) { setAccountError(error.message); setLoading(false); }
      else receiveSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => {
      mounted = false;
      accountRun.current++;
      currentUserId.current = null;
      if (timer) clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function fetchProfileData(userId: string, silent = false) {
    silent = silent && accountReady.current;
    const run = ++accountRun.current;
    if (!silent) setLoading(true);
    setAccountError(null);
    try {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_xapcon_account');
      if (bootstrapError) throw new Error(
        bootstrapError.code === 'PGRST202'
          ? 'Falta actualizar la base de datos de autenticación. Contacta al administrador.'
          : bootstrapError.message
      );
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileError || !profileData) throw new Error(profileError?.message || 'No se encontró tu perfil.');
      const activeProfile = profileData as UserProfile;
      const currentOrgId = activeProfile.organization_id;
      // 2. Obtener Organizaciones Asociadas
      // For super_admin: fetch ALL organizations (not just user's own)
      let orgData: any[] = [];
      if (activeProfile.role === 'super_admin') {
        const { data, error } = await supabase
          .from('organizations')
          .select('*');
        if (error) throw error;
        if (data) orgData = data.map(o => ({ organizations: o }));
      } else {
        const { data, error } = await supabase
          .from('user_organizations')
          .select(`
            organization_id,
            membership_role,
            organizations (
              *
            )
          `)
          .eq('user_id', userId);
        if (error) throw error;
        if (data) orgData = data;
      }

      if (run !== accountRun.current || currentUserId.current !== userId) return;
      if (activeProfile.role !== 'super_admin' && !orgData.length) throw new Error('Tu cuenta todavía no tiene una empresa vinculada. Solicita una invitación.');
      setProfile(activeProfile);
      accountReady.current = true;

      if (orgData && orgData.length > 0) {
        // Mapear la respuesta de Supabase
        const orgs = orgData.filter(item => item.organizations).map((item: any) => ({ ...item.organizations, membership_role: item.membership_role })) as Organization[];
        setOrganizations(orgs);
        
        // Intentar usar la organización activa guardada en localStorage, la del perfil, o la primera
        let active = orgs[0];
        try {
          const saved = localStorage.getItem("crm_active_organization");
          if (saved) {
            const parsed = JSON.parse(saved);
            const found = orgs.find(o => o.id === parsed.id);
            if (found) active = found;
            else active = orgs.find(o => o.id === currentOrgId) || orgs[0];
          } else {
            active = orgs.find(o => o.id === currentOrgId) || orgs[0];
          }
        } catch {
          active = orgs.find(o => o.id === currentOrgId) || orgs[0];
        }
        
        if (activeProfile.role === 'super_admin') {
           const saved = localStorage.getItem("crm_active_organization");
           if (saved) {
             try {
               const parsed = JSON.parse(saved);
               const found = orgs.find(o => o.id === parsed.id);
               setActiveOrganization(found || null);
             } catch {
               setActiveOrganization(null);
             }
           } else {
             setActiveOrganization(null);
           }
        } else {
           setActiveOrganization(active);
        }
      } else {
        setOrganizations([]);
        setActiveOrganization(null);
      }
    } catch (error) {
      if (run === accountRun.current && !silent) {
        setProfile(null);
        setOrganizations([]);
        setActiveOrganization(null);
        setAccountError(error instanceof Error ? error.message : (error as { message?: string })?.message || 'No se pudo preparar tu cuenta.');
      }
    } finally {
      if (run === accountRun.current) setLoading(false);
    }
  }

  const retryAccount = async () => {
    if (currentUserId.current) await fetchProfileData(currentUserId.current);
  };

  useEffect(() => {
    if (!session?.user.id) return;
    const userId = session.user.id;
    const refresh = () => void fetchProfileData(userId, true);
    const interval = setInterval(refresh, 60000);
    const channel = supabase.channel(`my-memberships-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_organizations', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { clearInterval(interval); void supabase.removeChannel(channel); };
  }, [session?.user.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    setProfile,
    organizations,
    setOrganizations,
    activeOrganization,
    setActiveOrganization,
    signOut,
    loading,
    accountError,
    retryAccount,
    passwordRecovery,
    finishPasswordRecovery: () => setPasswordRecovery(false)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
