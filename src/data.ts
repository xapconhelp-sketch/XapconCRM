import { Lead, Estimate, KanbanProject, Invoice, TeamMember, CriticalAlert, InspectionAppointment } from "./types";

export const initialLeads: Lead[] = [
  {
    id: "APX-9824",
    name: "James Robertson",
    status: "Inspección Completada",
    address: "4250 Oakwood Drive, Austin, TX 78759",
    phone: "(555) 019-2837",
    email: "j.robertson@email.com",
    propertyType: "Residential - Single Family",
    sqft: 2400,
    insuranceProvider: "State Farm",
    claimNumber: "SF-99482-TX",
    adjusterName: "David Chen",
    assignedRep: "Michael Chen",
    assignedRepAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA3-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC",
    createdAt: "Oct 23, 2026",
    timeline: [
      {
        id: "t1",
        type: "status_change",
        author: "System Auto-Update",
        title: "Cambio de Estado",
        content: "Status changed to Inspección Completada",
        timestamp: "10:42 AM, Today"
      },
      {
        id: "t2",
        type: "photo_upload",
        author: "Mike Fieldson",
        title: "Fotos de inspección subidas",
        content: "Significant hail damage observed on the northern slope. Mentioning @SarahDesk for estimate prep.",
        timestamp: "9:15 AM, Today",
        photos: [
          "https://lh3.googleusercontent.com/aida-public/AB6AXuArBNp7BEZG9OvzPonIX_90icnmWwbg4cZ2Vpvx8QVE1BwPeqFSjuoiV1xf0-ncZC8zp7X-UBum7MhbIoTqpikM0rOAy25J3L6Wdx0X1gTQoS_SCD4s4Zh4o0qq7tCq8tbbqxrWrY0kk2g-XBvAVEp4BsOe4A-das_o2uWSQpd-4TVRyUw5UhPaSTZnOpbbMQplgAlYurFTLWm9jdTN-PlM7ReKJd-lAckNy4vHiTgZ1v9Of1T7kp1xeKWl1e7rQ53sV-paNnBW7Fim",
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAJi4d6SW_CF0ozdV5DK2v66WIDuVmWlCkN-YdiOvtGW4vflRdKpy3rKD-wA4LsCnRu0Ugna6QEEkvkBBmQ9Fhj77OfcZz9bOBB9KtfklEj3wgrlfFgbMpLD49oEGYOERsH7_OfAgSy0q97yKliz50EEccUbCnRJMxpvaEEVFSPgofvv0QPT-8mO5GFBAZzQNNpFXvsblFdmNH3Kgl3I0G7c7U1OcChNKUcLD5hWYL_vTIojer5DqkVlp-ikcTQ1Bv9cLdasRLwE1Ap"
        ]
      },
      {
        id: "t3",
        type: "call_log",
        author: "Sarah Desk",
        title: "Llamada entrante registrada",
        content: '"Client called to confirm if the adjuster meeting is set. I confirmed we are waiting on State Farm\'s schedule."',
        timestamp: "Yesterday, 4:30 PM",
        duration: "4m 12s"
      },
      {
        id: "t4",
        type: "note",
        author: "Michael Chen",
        title: "Consulta Inicial",
        content: "Discussed hail damage concerns. Homeowner noted severe storm on Oct 22nd.",
        timestamp: "Oct 24, 10:30 AM"
      },
      {
        id: "t5",
        type: "system",
        author: "System Event",
        title: "Lead Creado",
        content: "Imported via Web Form",
        timestamp: "Oct 23, 4:15 PM"
      }
    ],
    documents: [
      { id: "d1", name: "EagleView_Report_Robertson.pdf", size: "2.4 MB", category: "Reporte" },
      { id: "d2", name: "StateFarm_Claim_Sheet.pdf", size: "1.1 MB", category: "Seguro" },
      { id: "d3", name: "Damage_Summary_Photos.zip", size: "14.5 MB", category: "Foto" }
    ],
    tasks: [
      { id: "task1", title: "Schedule Adjuster Meeting", dueDate: "Due Today", status: "pending", priority: "high" },
      { id: "task2", title: "Draft Initial Estimate", dueDate: "Due Tomorrow", status: "pending", priority: "medium" },
      { id: "task3", title: "Complete Drone Inspection", dueDate: "Done", status: "completed", priority: "medium" }
    ],
    company: "Robertson Roofing"
  },
  {
    id: "APX-9825",
    name: "Sarah Jenkins",
    status: "Nuevo",
    address: "712 Highland Avenue, West Lake Hills, TX 78746",
    phone: "(555) 123-9876",
    email: "sjenkins@gmail.com",
    propertyType: "Residential - Multi Family",
    sqft: 3600,
    insuranceProvider: "Allstate",
    claimNumber: "Pending",
    adjusterName: "Not Assigned",
    assignedRep: "Marcus Thorne",
    assignedRepAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAF8Dedh0UEGuqYsUzr2JHGjy2W83G3UwsT6hkmNdF_Degb7cM2BLgjUhQQAZv2riR06YGGhd30tDVaOQI4OzP1a7pzstqUuofYjRBxQc-ZBNwAS-lZ9UCcm2uF5Qb2tsKJa7T1u5S0zf6oMMi8X2517-p-Gd1iWtMMwnaP6sEkNsc8Z-vATkvZ_dOBnp_7hCdsBqGg2Wa1x9MyBfgfMqzIxToaS7S0enelFdcIPLmHrFvrLYi9zEh-06sQaxgv2SDumRdUDjYxJKjC",
    createdAt: "Oct 24, 2026",
    timeline: [
      {
        id: "sj-1",
        type: "system",
        author: "System Event",
        title: "Lead Creado",
        content: "Imported via Referral Program",
        timestamp: "Oct 24, 9:00 AM"
      }
    ],
    documents: [],
    tasks: [
      { id: "sj-task-1", title: "Contact Lead to Qualify", dueDate: "Due Today", status: "pending", priority: "high" }
    ],
    company: "Jenkins Contractors"
  }
];

export const initialEstimate: Estimate = {
  id: "EST-2409-A",
  leadId: "APX-9824",
  clientName: "James Robertson",
  address: "1244 Maplewood Dr, Austin, TX 78704",
  clientPhone: "(555) 019-2837",
  clientEmail: "j.robertson@email.com",
  status: "Draft",
  items: [
    {
      id: "est-i1",
      description: "Architectural Shingles (Owens Corning Oakridge - Garnet Gray)",
      category: "material",
      qty: 45,
      unit: "SQ",
      unitPrice: 120,
      total: 5400
    },
    {
      id: "est-i2",
      description: "Synthetic Underlayment (RhinoRoof 15 lb equivalent)",
      category: "material",
      qty: 12,
      unit: "Rolls",
      unitPrice: 85,
      total: 1020
    },
    {
      id: "est-i3",
      description: "Ridge Venting (Cobra Exhaust Vent)",
      category: "material",
      qty: 80,
      unit: "LF",
      unitPrice: 12.5,
      total: 1000,
      warning: "Cobra Exhaust Vent"
    },
    {
      id: "est-i4",
      description: "Mano de Obra (Labor) - Tear off & Installation",
      category: "labor",
      qty: 45,
      unit: "SQ",
      unitPrice: 95,
      total: 4275
    }
  ],
  subtotalMaterials: 7420,
  subtotalLabor: 4275,
  subtotalFees: 350, // Permisos y Tasas
  subtotalGross: 12045,
  taxRate: 0.0825,
  taxAmount: 993.71,
  total: 13038.71,
  profitMargin: 24.5
};

export const initialProjects: KanbanProject[] = [
  {
    id: "p1",
    projectCode: "PRJ-8092",
    title: "Anderson Residence",
    address: "1420 Valley View Rd, Austin, TX",
    category: "Architectural Shingle",
    durationEstimate: "Est. 2 Days",
    status: "scheduled",
    statusText: "Scheduled",
    isWarning: false,
    company: "Robertson Roofing"
  },
  {
    id: "p2",
    projectCode: "PRJ-8088",
    title: "Chen Commercial",
    address: "Building 4, Tech Park Blvd",
    category: "TPO Flat Roof",
    durationEstimate: "Tomorrow",
    status: "ordered",
    statusText: "Material Ordered",
    isWarning: false,
    company: "Jenkins Contractors"
  },
  {
    id: "p3",
    projectCode: "PRJ-8075",
    title: "Martinez Estate",
    address: "882 Oak Creek Lane, Lakeway",
    category: "Crew Alpha",
    durationEstimate: "Tear-off & Underlayment",
    status: "in_progress",
    statusText: "In Progress",
    progress: 45,
    crews: [
      { name: "Dave Vance", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAmUy4bpb8Rqyjp3zbPcMIPs6jdjpv5WoLQ22idVPDwXvWcqTgG-hnMNC1xagd3l_S3HfDQ8XHyehU7RjmYgHwXla-9P0j1LPAUxhys15DmbzfpZffw2slKt4y0p0elAHXm6dC3KhS90tqQLoen72iP3xKEz4QXQknPZ0J9tqUkVfwypuiX3Po8eNY9bI4zPLaGXxR7jX7cHmUbW_cenJy6BvOub5kfxizaaKNKn6TLWPo8elDyW06jZHnoLsIINYfovX4dqym6HLAa" },
      { name: "John Smith", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzImCDP7Stl4rUiGwuD1tgx7khMNM_SEU1mub4lTAcgV-jLDyLrJOvYtofsXT5bb9NiYMq2sgaEvB-IZx85ZV2Njl4gJXamNuE-We_2rawt5966rGpwF5hy3SaiSDHCDVKdGA3ABKlbSvFtqgE9dDXyTQqOhqbQ7eC_5EDV6XLD2rDQskfQmuEDRwzptZnJif8SKngPvuf1FFCzAXkRe6ClCPHCackeX0HT8n5NvQAsMxzSaYXyrmQsonUbhNp-oykNR37MRB9rmMw" }
    ],
    isWarning: false,
    company: "Robertson Roofing"
  },
  {
    id: "p4",
    projectCode: "PRJ-8071",
    title: "First Baptist Church",
    address: "100 Main St, Georgetown",
    category: "Standing Seam Metal",
    durationEstimate: "Panel Installation",
    status: "in_progress",
    statusText: "Weather Delay",
    progress: 70,
    isWarning: true,
    warningText: "Weather Delay",
    company: "Jenkins Contractors"
  },
  {
    id: "p5",
    projectCode: "PRJ-8055",
    title: "O'Connor Roofing",
    address: "5590 Pine Blvd, Round Rock",
    category: "Standing Seam Metal",
    durationEstimate: "QA Checklist",
    status: "qa",
    statusText: "QA Inspection",
    isWarning: false,
    company: "Robertson Roofing"
  }
];

export const initialInvoices: Invoice[] = [
  { id: "i1", invoiceNumber: "INV-4029", clientName: "Oakhaven Retail Plaza", projectCategory: "Commercial Flat Roof", amount: 45200, status: "Paid", company: "Robertson Roofing" },
  { id: "i2", invoiceNumber: "INV-4028", clientName: "Sarah Jenkins", projectCategory: "Residential Asphalt", amount: 12450, status: "Overdue", company: "Jenkins Contractors" },
  { id: "i3", invoiceNumber: "INV-4027", clientName: "Westside Industrial", projectCategory: "Metal Roof Repair", amount: 8900, status: "Pending", company: "Robertson Roofing" },
  { id: "i4", invoiceNumber: "INV-4026", clientName: "Pine Crest HOA", projectCategory: "Multi-Family Shingle", amount: 112000, status: "Pending", company: "Jenkins Contractors" }
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: "tm1",
    name: "Marcus Thorne",
    role: "Senior Sales Rep",
    roleCategory: "sales",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAF8Dedh0UEGuqYsUzr2JHGjy2W83G3UwsT6hkmNdF_Degb7cM2BLgjUhQQAZv2riR06YGGhd30tDVaOQI4OzP1a7pzstqUuofYjRBxQc-ZBNwAS-lZ9UCcm2uF5Qb2tsKJa7T1u5S0zf6oMMi8X2517-p-Gd1iWtMMwnaP6sEkNsc8Z-vATkvZ_dOBnp_7hCdsBqGg2Wa1x9MyBfgfMqzIxToaS7S0enelFdcIPLmHrFvrLYi9zEh-06sQaxgv2SDumRdUDjYxJKjC",
    status: "Available",
    activeLeads: 24,
    closeRate: 72
  },
  {
    id: "tm2",
    name: "Elena Rostova",
    role: "Project Manager",
    roleCategory: "pm",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBIDkgyYv3Iu_8OJp4uLN-pZuCbNraUZ1jBPLDYDEdAW6YN1emP6NQbjmZrUriaZh9TidM2WtEnKN4vDqbSgvisMcnP4nFAA7153qHZFCUCYOTZhEhg_3TYWfhS9v5-cdwyavZ9_v8W6EXxvaNjMa45AXfJb5y4kFRBpQU1pA9hSMvmLcGPa1cyFLcF3ILyb8FBXXNQuGXGjLR23434FXiJ9PcpvPTRG0IqEPwKUVcNQmkqkI9EepGC1yHVfTWG2iySY3K1hM7Jp2sq",
    status: "On Site (Busy)",
    activeProjects: 5,
    sitesInspected: 12
  },
  {
    id: "tm3",
    name: "David Vance",
    role: "Crew Lead - Team Alpha",
    roleCategory: "install",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAmUy4bpb8Rqyjp3zbPcMIPs6jdjpv5WoLQ22idVPDwXvWcqTgG-hnMNC1xagd3l_S3HfDQ8XHyehU7RjmYgHwXla-9P0j1LPAUxhys15DmbzfpZffw2slKt4y0p0elAHXm6dC3KhS90tqQLoen72iP3xKEz4QXQknPZ0J9tqUkVfwypuiX3Po8eNY9bI4zPLaGXxR7jX7cHmUbW_cenJy6BvOub5kfxizaaKNKn6TLWPo8elDyW06jZHnoLsIINYfovX4dqym6HLAa",
    status: "Available",
    crewMembersCount: 6,
    onTimeRate: 98
  },
  {
    id: "tm4",
    name: "Carlos Robertson",
    role: "Contratista Principal",
    roleCategory: "contractor",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzImCDP7Stl4rUiGwuD1tgx7khMNM_SEU1mub4lTAcgV-jLDyLrJOvYtofsXT5bb9NiYMq2sgaEvB-IZx85ZV2Njl4gJXamNuE-We_2rawt5966rGpwF5hy3SaiSDHCDVKdGA3ABKlbSvFtqgE9dDXyTQqOhqbQ7eC_5EDV6XLD2rDQskfQmuEDRwzptZnJif8SKngPvuf1FFCzAXkRe6ClCPHCackeX0HT8n5NvQAsMxzSaYXyrmQsonUbhNp-oykNR37MRB9rmMw",
    status: "Available",
    email: "robertson@empresa.com",
    company: "Robertson Roofing"
  },
  {
    id: "tm5",
    name: "Andrea Jenkins",
    role: "Contratista Asociada",
    roleCategory: "contractor",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAF8Dedh0UEGuqYsUzr2JHGjy2W83G3UwsT6hkmNdF_Degb7cM2BLgjUhQQAZv2riR06YGGhd30tDVaOQI4OzP1a7pzstqUuofYjRBxQc-ZBNwAS-lZ9UCcm2uF5Qb2tsKJa7T1u5S0zf6oMMi8X2517-p-Gd1iWtMMwnaP6sEkNsc8Z-vATkvZ_dOBnp_7hCdsBqGg2Wa1x9MyBfgfMqzIxToaS7S0enelFdcIPLmHrFvrLYi9zEh-06sQaxgv2SDumRdUDjYxJKjC",
    status: "Available",
    email: "jenkins@empresa.com",
    company: "Jenkins Contractors"
  }
];

export const initialCriticalAlerts: CriticalAlert[] = [
  {
    id: "a1",
    type: "document",
    title: "Documentación Faltante: Reclamo #4592",
    description: "Cliente: Smith Residency. Falta reporte pericial inicial.",
    targetId: "APX-9824",
    buttonText: "Resolver"
  },
  {
    id: "a2",
    type: "material",
    title: "Retraso en Materiales: Proyecto #112A",
    description: "Shingles asfálticos demorados 48h. Afecta cronograma de equipo 3.",
    targetId: "PRJ-8088",
    buttonText: "Revisar"
  }
];

export const initialInspections: InspectionAppointment[] = [
  {
    id: "insp1",
    dateTime: "Hoy, 10:30 AM",
    timeRemaining: "En 1.5 horas",
    clientName: "Residencia Martínez",
    address: "1422 Elm St, Dallas, TX",
    type: "Inicial (Tormenta)",
    inspectorName: "J. Doe",
    inspectorInitials: "JD"
  },
  {
    id: "insp2",
    dateTime: "Hoy, 02:15 PM",
    clientName: "Edificio Comercial Xapcon",
    address: "800 Corporate Pkwy, Plano, TX",
    type: "Control Calidad (Post)",
    inspectorName: "M. Ruiz",
    inspectorInitials: "MR"
  },
  {
    id: "insp3",
    dateTime: "Mañana, 09:00 AM",
    clientName: "Familia Johnson",
    address: "55 West Blvd, Frisco, TX",
    type: "Presupuesto Anual",
    inspectorName: "J. Doe",
    inspectorInitials: "JD"
  }
];
