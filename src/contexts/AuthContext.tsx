import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  organization_id?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  invite_code: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  organizations: Organization[];
  activeOrganization: Organization | null;
  setActiveOrganization: (org: Organization | null) => void;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const runningFetches = new Map<string, Promise<any>>();

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

    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfileData(session.user.id);
          }
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (event === 'SIGNED_IN' && session?.user) {
            await fetchProfileData(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setOrganizations([]);
            setActiveOrganization(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  function generateUniqueInviteCode(): string {
    const randomSegment = Math.random()
      .toString(36)
      .substring(2, 8) // Extrae exactamente 6 caracteres
      .toUpperCase();  // Lo convierte a mayúsculas
    const secureCode = randomSegment.padEnd(6, '0');
    return `XAP-${secureCode}`;
  }

  async function fetchProfileData(userId: string) {
    if (runningFetches.has(userId)) {
      return runningFetches.get(userId);
    }

    const fetchPromise = (async () => {
      // Obtener sesión para metadatos de auto-healing
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userMetadata = currentSession?.user?.user_metadata || {};

      // 1. Obtener Perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      let activeProfile = { ...profileData } as UserProfile;
      let currentOrgId = profileData.organization_id;

      // CASO A: El usuario es Dueño y aún no tiene creada su organización
      if (activeProfile.role === 'Dueño' && !currentOrgId) {
        const companyName = userMetadata.companyName || "Mi Empresa";
        const inviteCode = generateUniqueInviteCode();

        // A1. Crear la nueva organización
        const { data: newOrg, error: orgCreateError } = await supabase
          .from('organizations')
          .insert({
            name: companyName,
            company_name: companyName,
            invite_code: inviteCode
          })
          .select()
          .single();

        if (newOrg && !orgCreateError) {
          // A2. Vincular usuario a la nueva organización en perfiles
          const { error: profUpdateError } = await supabase
            .from('profiles')
            .update({ organization_id: newOrg.id })
            .eq('id', userId);

          if (!profUpdateError) {
            activeProfile.organization_id = newOrg.id;
            currentOrgId = newOrg.id;
          }

          // A3. Registrar la relación en la tabla puente multi-empresa
          await supabase.from('user_organizations').insert({
            user_id: userId,
            organization_id: newOrg.id
          });
        } else {
          console.error("Error al crear organización en Auto-Healing:", orgCreateError);
        }
      }

      // CASO B: El usuario es Colaborador y tiene un código de invitación pendiente
      if (activeProfile.role !== 'Dueño' && activeProfile.role !== 'super_admin' && !currentOrgId && userMetadata.companyCode) {
        const cleanCode = userMetadata.companyCode.trim().toUpperCase();
        
        const { data: org, error: orgFetchError } = await supabase
          .from('organizations')
          .select('id')
          .eq('invite_code', cleanCode)
          .single();

        if (org && !orgFetchError) {
          // B1. Vincular al usuario con el ID de la organización encontrada
          const { error: profUpdateError } = await supabase
            .from('profiles')
            .update({ organization_id: org.id })
            .eq('id', userId);

          if (!profUpdateError) {
            activeProfile.organization_id = org.id;
            currentOrgId = org.id;
          }

          // B2. Registrar en la tabla puente
          await supabase.from('user_organizations').insert({
            user_id: userId,
            organization_id: org.id
          });
        } else {
          console.error("Error al buscar organización para código en Auto-Healing:", orgFetchError);
        }
      }

      // 2. Obtener Organizaciones Asociadas
      // For super_admin: fetch ALL organizations (not just user's own)
      let orgData: any[] = [];
      if (activeProfile.role === 'super_admin') {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, invite_code');
        if (!error && data) orgData = data.map(o => ({ organizations: o }));
      } else {
        const { data, error } = await supabase
          .from('user_organizations')
          .select(`
            organization_id,
            organizations (
              id,
              name,
              invite_code
            )
          `)
          .eq('user_id', userId);
        if (!error && data) orgData = data;
      }

      setProfile(activeProfile);

      if (orgData && orgData.length > 0) {
        // Mapear la respuesta de Supabase
        const orgs = orgData.map((item: any) => item.organizations) as Organization[];
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
    })();

    runningFetches.set(userId, fetchPromise);
    try {
      await fetchPromise;
    } finally {
      runningFetches.delete(userId);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    organizations,
    activeOrganization,
    setActiveOrganization,
    signOut,
    loading
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
