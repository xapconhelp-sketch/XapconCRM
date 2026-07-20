import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedLeads() {
  console.log("Conectando a Supabase para reinsertar los datos estáticos...");
  
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('*').limit(1);
  if (orgError || !orgs || orgs.length === 0) {
    console.error("Error obteniendo organization_id", orgError);
    return;
  }
  const orgId = orgs[0].id;

  const mockLeads = [
    {
      name: "James Robertson",
      status: "Inspección Completada",
      address: "4250 Oakwood Drive, Austin, TX 78759",
      phone: "(555) 019-2837",
      email: "j.robertson@email.com",
      property_type: "Residential - Single Family",
      sqft: 2400,
      insurance_provider: "State Farm",
      claim_number: "SF-99482-TX",
      adjuster_name: "David Chen",
      assigned_rep: "Michael Chen",
      assigned_rep_avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMn-jxxsxze-KxE7RjITjibnMpECd9pRZt1yZyyDI5eazYLGRCAFWs9B1gPugfJKxBDA3-yro9u2C0jFV-hNcuCsA2C5HKO4x0IDFsMjuyEEdVA779oxdqiVl1wcSGhBwJAFEY6SMnvjhwRmD-MgiRxcXe5-EEND8x0mJLrnlHXmvXrCH8fuMGbKw-yA8vlL8HA10YP-v5XdlZ1J1tU5QaON6ngK6M9bPDxJzwpKF5OBqDCEKUTYULl2f224zGtFpozg6XEPqYAUC",
      organization_id: orgId,
      is_insurance_claim: true,
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
      ]
    },
    {
      name: "Sarah Jenkins",
      status: "Nuevo",
      address: "712 Highland Avenue, West Lake Hills, TX 78746",
      phone: "(555) 123-9876",
      email: "sjenkins@gmail.com",
      property_type: "Residential - Multi Family",
      sqft: 3600,
      insurance_provider: "Allstate",
      claim_number: "Pending",
      adjuster_name: "Not Assigned",
      assigned_rep: "Marcus Thorne",
      assigned_rep_avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAF8Dedh0UEGuqYsUzr2JHGjy2W83G3UwsT6hkmNdF_Degb7cM2BLgjUhQQAZv2riR06YGGhd30tDVaOQI4OzP1a7pzstqUuofYjRBxQc-ZBNwAS-lZ9UCcm2uF5Qb2tsKJa7T1u5S0zf6oMMi8X2517-p-Gd1iWtMMwnaP6sEkNsc8Z-vATkvZ_dOBnp_7hCdsBqGg2Wa1x9MyBfgfMqzIxToaS7S0enelFdcIPLmHrFvrLYi9zEh-06sQaxgv2SDumRdUDjYxJKjC",
      organization_id: orgId,
      is_insurance_claim: false,
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
        { id: "sj-t1", title: "Initial Contact Call", dueDate: "Due Today", status: "pending", priority: "high" }
      ]
    }
  ];

  const { data, error } = await supabase.from('leads').insert(mockLeads);
    
  if (error) {
    console.error("Error insertando leads:", error);
  } else {
    console.log("Leads estáticos reinsertados exitosamente.");
  }
}

seedLeads();
