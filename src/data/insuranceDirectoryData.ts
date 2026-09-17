import { Lead, InsuranceCompanyStats } from "../types";

export interface MasterInsuranceCompany {
  id: string;
  name: string;
  aliases: string[];
  defaultEmails: string[];
  defaultPhones: string[];
  portalUrl?: string;
  website?: string;
  category: "Nacional" | "Regional" | "Especializada";
  description: string;
}

export const MASTER_INSURANCE_COMPANIES: MasterInsuranceCompany[] = [
  {
    id: "safeco",
    name: "Safeco Insurance (Liberty Mutual)",
    aliases: ["Safeco", "Saffeco", "Safeco Insurance", "Saffeco Insurance"],
    defaultEmails: ["propertyclaims@safeco.com", "claims@safeco.com"],
    defaultPhones: ["1-800-332-3226", "1-888-435-7764"],
    portalUrl: "https://www.safeco.com/claims",
    website: "https://www.safeco.com",
    category: "Nacional",
    description: "Filial de Liberty Mutual especializada en pólizas residenciales y comerciales."
  },
  {
    id: "state-farm",
    name: "State Farm",
    aliases: ["State Farm", "Statefarm", "State Farm Insurance"],
    defaultEmails: ["statefarmfireclaims@statefarm.com"],
    defaultPhones: ["1-800-782-8332", "1-844-458-4300"],
    portalUrl: "https://www.statefarm.com/claims",
    website: "https://www.statefarm.com",
    category: "Nacional",
    description: "La mayor aseguradora de propiedades residenciales en Estados Unidos."
  },
  {
    id: "allstate",
    name: "Allstate",
    aliases: ["Allstate", "Allstate Insurance"],
    defaultEmails: ["claims@claims.allstate.com"],
    defaultPhones: ["1-800-255-7828", "1-800-669-1552"],
    portalUrl: "https://www.allstate.com/claims",
    website: "https://www.allstate.com",
    category: "Nacional",
    description: "Uno de los proveedores líderes en seguros para propietarios de viviendas."
  },
  {
    id: "travelers",
    name: "Travelers",
    aliases: ["Travelers", "Travelers Insurance", "The Travelers"],
    defaultEmails: ["reportclaims@travelers.com", "propertydocs@travelers.com"],
    defaultPhones: ["1-800-252-4633", "1-800-238-6225"],
    portalUrl: "https://www.travelers.com/claims",
    website: "https://www.travelers.com",
    category: "Nacional",
    description: "Aseguradora global con amplia cobertura en tormentas y granizo."
  },
  {
    id: "liberty-mutual",
    name: "Liberty Mutual",
    aliases: ["Liberty Mutual", "Liberty Mutual Insurance", "Liberty"],
    defaultEmails: ["claims@libertymutual.com", "firstreport@libertymutual.com"],
    defaultPhones: ["1-800-225-2467", "1-844-825-2467"],
    portalUrl: "https://www.libertymutual.com/claims",
    website: "https://www.libertymutual.com",
    category: "Nacional",
    description: "Sexta aseguradora de propiedad y accidentes a nivel mundial."
  },
  {
    id: "usaa",
    name: "USAA",
    aliases: ["USAA", "USAA Insurance", "United Services Automobile Association"],
    defaultEmails: ["claims@usaa.com", "propertyclaims@usaa.com"],
    defaultPhones: ["1-800-531-8722", "1-210-531-8722"],
    portalUrl: "https://www.usaa.com/insurance/claims",
    website: "https://www.usaa.com",
    category: "Nacional",
    description: "Servicios de seguros de alta calidad para miembros de las fuerzas armadas y familias."
  },
  {
    id: "farmers",
    name: "Farmers Insurance",
    aliases: ["Farmers Insurance", "Farmers Group"],
    defaultEmails: ["myclaim@farmersinsurance.com"],
    defaultPhones: ["1-800-435-7764", "1-855-327-6222"],
    portalUrl: "https://www.farmers.com/claims",
    website: "https://www.farmers.com",
    category: "Nacional",
    description: "Grupo asegurador con gran presencia en reclamos de techado y daños por viento/granizo."
  },
  {
    id: "nationwide",
    name: "Nationwide",
    aliases: ["Nationwide", "Nationwide Insurance", "Nation Wide"],
    defaultEmails: ["claims@nationwide.com", "propertyloss@nationwide.com"],
    defaultPhones: ["1-800-421-3535", "1-866-322-3214"],
    portalUrl: "https://www.nationwide.com/claims",
    website: "https://www.nationwide.com",
    category: "Nacional",
    description: "Aseguradora con presencia en los 50 estados con atención 24/7."
  },
  {
    id: "progressive",
    name: "Progressive (Home Advantage)",
    aliases: ["Progressive", "Progressive Home", "Progressive Insurance", "ASI Progressive"],
    defaultEmails: ["homeclaims@progressive.com", "property@asi.progressive.com"],
    defaultPhones: ["1-800-776-4737", "1-866-274-8765"],
    portalUrl: "https://www.progressive.com/claims",
    website: "https://www.progressive.com",
    category: "Nacional",
    description: "Cobertura de propiedad a través de American Strategic Insurance (ASI)."
  },
  {
    id: "american-family",
    name: "American Family Insurance",
    aliases: ["American Family", "AmFam", "American Family Insurance"],
    defaultEmails: ["claims@amfam.com", "lossreports@amfam.com"],
    defaultPhones: ["1-800-692-6326", "1-888-263-2657"],
    portalUrl: "https://www.amfam.com/claims",
    website: "https://www.amfam.com",
    category: "Regional",
    description: "Fuerte presencia en el medio oeste y sur de Estados Unidos."
  },
  {
    id: "hartford",
    name: "The Hartford",
    aliases: ["The Hartford", "Hartford", "Hartford Insurance"],
    defaultEmails: ["property.claims@thehartford.com", "firstnotice@thehartford.com"],
    defaultPhones: ["1-800-243-5860", "1-877-805-9918"],
    portalUrl: "https://www.thehartford.com/claims",
    website: "https://www.thehartford.com",
    category: "Nacional",
    description: "Reconocida por pólizas de alto valor y programa AARP."
  },
  {
    id: "cincinnati",
    name: "Cincinnati Financial",
    aliases: ["Cincinnati Financial", "Cincinnati Insurance", "Cincinnati"],
    defaultEmails: ["claims_mail@cinfin.com", "propertyloss@cinfin.com"],
    defaultPhones: ["1-877-242-2544", "1-513-870-2000"],
    portalUrl: "https://www.cinfin.com/claims",
    website: "https://www.cinfin.com",
    category: "Regional",
    description: "Pólizas residenciales de gama alta con excelente respuesta en suplementos."
  },
  {
    id: "chubb",
    name: "Chubb",
    aliases: ["Chubb", "Chubb Insurance", "Chubb Group"],
    defaultEmails: ["claims@chubb.com", "propertyclaims@chubb.com"],
    defaultPhones: ["1-800-252-4670", "1-800-433-0385"],
    portalUrl: "https://www.chubb.com/claims",
    website: "https://www.chubb.com",
    category: "Especializada",
    description: "Líder en propiedades de alto valor y pólizas de lujo."
  },
  {
    id: "kemper",
    name: "Kemper",
    aliases: ["Kemper", "Kemper Insurance", "Kemper Direct"],
    defaultEmails: ["propertyclaims@kemper.com", "claims@kemper.com"],
    defaultPhones: ["1-800-353-6737", "1-888-252-2799"],
    portalUrl: "https://www.kemper.com/claims",
    website: "https://www.kemper.com",
    category: "Regional",
    description: "Aseguradora con amplia cartera en pólizas residenciales familiares."
  },
  {
    id: "mercury",
    name: "Mercury Insurance",
    aliases: ["Mercury", "Mercury Insurance", "Mercury Casualty"],
    defaultEmails: ["claims@mercuryinsurance.com", "propertyclaims@mercuryinsurance.com"],
    defaultPhones: ["1-800-503-3724", "1-888-637-2176"],
    portalUrl: "https://www.mercuryinsurance.com/claims",
    website: "https://www.mercuryinsurance.com",
    category: "Regional",
    description: "Especializada en tarifas competitivas y atención directa."
  },
  {
    id: "national-general",
    name: "National General (Allstate)",
    aliases: ["National General", "National General Insurance", "NatGen"],
    defaultEmails: ["claims@natgen.com", "propertyclaims@natgen.com"],
    defaultPhones: ["1-800-325-1088", "1-800-468-3466"],
    portalUrl: "https://www.nationalgeneral.com/claims",
    website: "https://www.nationalgeneral.com",
    category: "Nacional",
    description: "Filial de Allstate para pólizas directas e independientes."
  },
  {
    id: "homesite",
    name: "Homesite Insurance",
    aliases: ["Homesite", "Homesite Insurance", "American Family Homesite"],
    defaultEmails: ["claims@homesite.com", "property@homesite.com"],
    defaultPhones: ["1-800-466-3748", "1-866-621-4823"],
    portalUrl: "https://www.homesite.com/claims",
    website: "https://www.homesite.com",
    category: "Especializada",
    description: "Proveedor digital de seguros para el hogar y partners mayoristas."
  },
  {
    id: "assurant-property",
    name: "Assurant Property",
    aliases: ["Assurant Property", "Assurant"],
    defaultEmails: ["propertyclaims@assurant.com"],
    defaultPhones: ["1-800-852-2244", "1-800-358-0600"],
    portalUrl: "https://www.assurant.com/claims",
    website: "https://www.assurant.com",
    category: "Especializada",
    description: "Especializada en seguros de propiedad, protección de activos y soluciones de vivienda."
  }
];

import { supabase } from "../lib/supabase";

export interface DbInsuranceCompany {
  id?: string;
  name: string;
  aliases?: string[];
  emails: string[];
  phones: string[];
  notes?: string;
  portal_url?: string;
  website?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_CUSTOM_CONTACTS_KEY = "xapcon_insurance_custom_contacts";

export interface CustomInsuranceContact {
  emails: string[];
  phones: string[];
  notes?: string;
}

export function getSavedCustomContacts(): Record<string, CustomInsuranceContact> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CONTACTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomContact(companyIdOrName: string, contact: { email?: string; phone?: string; notes?: string }) {
  try {
    const all = getSavedCustomContacts();
    const key = companyIdOrName.toLowerCase().trim();
    const existing = all[key] || { emails: [], phones: [], notes: "" };

    if (contact.email && contact.email.trim() && !existing.emails.includes(contact.email.trim())) {
      existing.emails.push(contact.email.trim());
    }
    if (contact.phone && contact.phone.trim() && !existing.phones.includes(contact.phone.trim())) {
      existing.phones.push(contact.phone.trim());
    }
    if (contact.notes !== undefined) {
      existing.notes = contact.notes;
    }

    all[key] = existing;
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_CONTACTS_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    console.error("Error saving custom insurance contact:", e);
    return {};
  }
}

export async function fetchDbInsuranceCompanies(): Promise<DbInsuranceCompany[]> {
  try {
    const { data, error } = await supabase
      .from('insurance_directory')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Table might not be created yet; keep local cache seamlessly
      return [];
    }

    if (data && data.length > 0) {
      const local = getSavedCustomContacts();
      data.forEach((item: any) => {
        const key = item.name.toLowerCase().trim();
        const existing = local[key] || { emails: [], phones: [], notes: "" };
        const emails = Array.from(new Set([...existing.emails, ...(Array.isArray(item.emails) ? item.emails : [])]));
        const phones = Array.from(new Set([...existing.phones, ...(Array.isArray(item.phones) ? item.phones : [])]));
        local[key] = {
          emails,
          phones,
          notes: item.notes || existing.notes || ""
        };
      });
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_CONTACTS_KEY, JSON.stringify(local));
      return data;
    }
    return [];
  } catch (err) {
    console.warn("fetchDbInsuranceCompanies error:", err);
    return [];
  }
}

export async function saveCustomContactToDb(
  companyName: string,
  contact: { email?: string; phone?: string; notes?: string; portalUrl?: string; website?: string }
): Promise<{ success: boolean; error?: string }> {
  // 1. Instant local persistence
  saveCustomContact(companyName, contact);

  // 2. Cloud persistence in Supabase
  try {
    const local = getSavedCustomContacts();
    const key = companyName.toLowerCase().trim();
    const record = local[key] || { emails: [], phones: [], notes: "" };

    const emails = [...record.emails];
    if (contact.email && contact.email.trim() && !emails.includes(contact.email.trim())) {
      emails.push(contact.email.trim());
    }

    const phones = [...record.phones];
    if (contact.phone && contact.phone.trim() && !phones.includes(contact.phone.trim())) {
      phones.push(contact.phone.trim());
    }

    const payload = {
      name: companyName.trim(),
      emails: emails,
      phones: phones,
      notes: contact.notes !== undefined ? contact.notes : (record.notes || ""),
      portal_url: contact.portalUrl || "",
      website: contact.website || "",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('insurance_directory')
      .upsert(payload, { onConflict: 'name' });

    if (error) {
      console.warn("Aviso al guardar en Supabase (tabla insurance_directory):", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Excepción guardando en Supabase:", err);
    return { success: false, error: err?.message };
  }
}

export function getAllInsuranceCompanyNames(claims: Lead[] = []): string[] {
  const set = new Set<string>();

  // Map deprecated / standalone names to their canonical master name
  const DEPRECATED_NAME_MAP: Record<string, string> = {
    "all state": "Allstate",
    "farmers": "Farmers Insurance",
    "assurant": "Assurant Property",
  };

  // 1. Standard master list
  MASTER_INSURANCE_COMPANIES.forEach(m => {
    set.add(m.name);
  });

  // 2. LocalStorage / DB custom list
  const local = getSavedCustomContacts();
  Object.keys(local).forEach(key => {
    // Check if this key is a deprecated name that should be remapped
    const canonical = DEPRECATED_NAME_MAP[key];
    if (canonical) {
      set.add(canonical);
      return;
    }

    const matched = MASTER_INSURANCE_COMPANIES.find(
      m => m.id === key || m.name.toLowerCase().trim() === key || m.aliases.some(a => a.toLowerCase().trim() === key)
    );
    if (matched) {
      set.add(matched.name);
    } else {
      // Capitalize proper words
      const formatted = key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      set.add(formatted);
    }
  });

  // 3. Distinct insuranceProvider from claims
  claims.forEach(c => {
    const p = (c.insuranceProvider || "").trim();
    if (p && p !== "No especificada" && p !== "Por reclamar") {
      const deprecatedCanonical = DEPRECATED_NAME_MAP[p.toLowerCase().trim()];
      if (deprecatedCanonical) {
        set.add(deprecatedCanonical);
      } else {
        set.add(p);
      }
    }
  });

  // Priority common names
  set.add("Safeco Insurance");
  set.add("State Farm");
  set.add("Allstate");

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function matchCompany(providerName: string, master: MasterInsuranceCompany): boolean {
  if (!providerName) return false;
  const p = providerName.toLowerCase().trim();
  if (p === master.name.toLowerCase().trim()) return true;
  return master.aliases.some(alias => {
    const a = alias.toLowerCase().trim();
    return p === a || p.includes(a) || a.includes(p);
  });
}

export function getAggregatedInsuranceDirectory(claims: Lead[] = []): InsuranceCompanyStats[] {
  const customContacts = getSavedCustomContacts();
  const resultMap = new Map<string, InsuranceCompanyStats>();

  // 1. Initialize with all Master Companies
  MASTER_INSURANCE_COMPANIES.forEach(master => {
    const custom = customContacts[master.id] || customContacts[master.name.toLowerCase().trim()] || { emails: [], phones: [], notes: "" };
    
    const initialEmails = Array.from(new Set([...master.defaultEmails, ...(custom.emails || [])]));
    const initialPhones = Array.from(new Set([...master.defaultPhones, ...(custom.phones || [])]));

    resultMap.set(master.id, {
      id: master.id,
      name: master.name,
      aliases: master.aliases,
      website: master.website,
      portalUrl: master.portalUrl,
      emails: initialEmails,
      phones: initialPhones,
      totalClaims: 0,
      activeClaims: 0,
      approvedClaims: 0,
      finalizedClaims: 0,
      deniedClaims: 0,
      inDisputeClaims: 0,
      adjusters: [],
      claims: [],
      customNotes: custom.notes || master.description
    });
  });

  // 2. Scan claims and aggregate real-world data
  claims.forEach(claim => {
    if (!claim) return;
    const providerName = (claim.insuranceProvider || "").trim();
    if (!providerName || providerName === "No especificada") return;

    // Find if it matches one of our master companies
    let matchedMaster = MASTER_INSURANCE_COMPANIES.find(m => matchCompany(providerName, m));
    let companyId = matchedMaster ? matchedMaster.id : providerName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    let entry = resultMap.get(companyId);
    if (!entry) {
      // Dynamic entry for new/unlisted insurance
      const custom = customContacts[companyId] || customContacts[providerName.toLowerCase().trim()] || { emails: [], phones: [], notes: "" };
      entry = {
        id: companyId,
        name: providerName,
        aliases: [providerName],
        emails: custom.emails || [],
        phones: custom.phones || [],
        totalClaims: 0,
        activeClaims: 0,
        approvedClaims: 0,
        finalizedClaims: 0,
        deniedClaims: 0,
        inDisputeClaims: 0,
        adjusters: [],
        claims: [],
        customNotes: custom.notes || "Aseguradora detectada desde casos registrados."
      };
      resultMap.set(companyId, entry);
    }

    // Add claim to list
    entry.claims.push(claim);
    entry.totalClaims += 1;

    // Status aggregation
    const status = (claim.status || "").toLowerCase();
    if (status.includes("finalizado") || status.includes("completado") || status.includes("cobrado")) {
      entry.finalizedClaims += 1;
    } else if (status.includes("negad") || status.includes("denied") || status.includes("cancelad")) {
      entry.deniedClaims += 1;
    } else if (status.includes("disputa") || status.includes("suplemento") || status.includes("scope")) {
      entry.inDisputeClaims += 1;
      entry.activeClaims += 1;
    } else if (status.includes("aprobado") || status.includes("construcción")) {
      entry.approvedClaims += 1;
      entry.activeClaims += 1;
    } else {
      entry.activeClaims += 1;
    }

    // Extract emails
    if (claim.insuranceEmail1 && claim.insuranceEmail1.trim() && !entry.emails.includes(claim.insuranceEmail1.trim())) {
      entry.emails.push(claim.insuranceEmail1.trim());
    }
    if (claim.insuranceEmail2 && claim.insuranceEmail2.trim() && !entry.emails.includes(claim.insuranceEmail2.trim())) {
      entry.emails.push(claim.insuranceEmail2.trim());
    }

    // Extract phones
    if (claim.insurancePhone1 && claim.insurancePhone1.trim() && !entry.phones.includes(claim.insurancePhone1.trim())) {
      entry.phones.push(claim.insurancePhone1.trim());
    }
    if (claim.insurancePhone2 && claim.insurancePhone2.trim() && !entry.phones.includes(claim.insurancePhone2.trim())) {
      entry.phones.push(claim.insurancePhone2.trim());
    }

    // Extract adjusters
    if (claim.adjusterName && claim.adjusterName.trim() && claim.adjusterName !== "Por asignar" && claim.adjusterName !== "Not Assigned") {
      if (!entry.adjusters.includes(claim.adjusterName.trim())) {
        entry.adjusters.push(claim.adjusterName.trim());
      }
    }
  });

  return Array.from(resultMap.values()).sort((a, b) => {
    // Sort by total claims descending, then alphabetically
    if (b.totalClaims !== a.totalClaims) {
      return b.totalClaims - a.totalClaims;
    }
    return a.name.localeCompare(b.name);
  });
}

export function getKnownContactsForInsurance(
  insuranceName: string,
  claims: Lead[] = []
): { emails: string[]; phones: string[]; adjusters: string[]; portalUrl?: string } {
  if (!insuranceName || !insuranceName.trim()) {
    return { emails: [], phones: [], adjusters: [] };
  }

  const all = getAggregatedInsuranceDirectory(claims);
  const query = insuranceName.toLowerCase().trim();

  const found = all.find(item => {
    if (item.name.toLowerCase().trim() === query) return true;
    if (item.id === query) return true;
    return item.aliases.some(a => a.toLowerCase().trim() === query || query.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(query));
  });

  if (found) {
    return {
      emails: found.emails,
      phones: found.phones,
      adjusters: found.adjusters,
      portalUrl: found.portalUrl
    };
  }

  return { emails: [], phones: [], adjusters: [] };
}
