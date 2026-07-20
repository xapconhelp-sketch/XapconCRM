process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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

async function clearInsuranceClaims() {
  console.log("Conectando a Supabase para borrar los insurance claims...");
  
  const { data, error } = await supabase
    .from('leads')
    .delete()
    .eq('is_insurance_claim', true);
    
  if (error) {
    console.error("Error borrando insurance claims:", error);
  } else {
    console.log("Insurance claims borrados exitosamente.");
  }
}

clearInsuranceClaims();
