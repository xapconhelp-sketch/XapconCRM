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

async function clearLeads() {
  console.log("Conectando a Supabase para borrar los leads de prueba...");
  
  // Borrar todos los leads donde el ID no sea nulo (es decir, todos)
  const { data, error } = await supabase
    .from('leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // hack para borrar todos los registros
    
  if (error) {
    console.error("Error borrando leads:", error);
  } else {
    console.log("Leads borrados exitosamente.");
  }
}

clearLeads();
