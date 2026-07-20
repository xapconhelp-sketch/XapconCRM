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

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAndDelete() {
  // First, find the lead to see what it is
  const { data, error: findError } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', '%Thalia%');
    
  if (findError) {
    console.error("Error encontrando a Thalia:", findError);
    return;
  }
  
  console.log("Encontrado:", data);

  if (data && data.length > 0) {
    const ids = data.map(d => d.id);
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('id', ids);
      
    if (deleteError) {
      console.error("Error borrando:", deleteError);
    } else {
      console.log("Borrados exitosamente.");
    }
  } else {
    console.log("No se encontró ningún registro en Supabase. Tal vez está hardcodeado en la app?");
  }
}

findAndDelete();
