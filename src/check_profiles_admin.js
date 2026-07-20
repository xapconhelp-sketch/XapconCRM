process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkProfiles() {
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@xapcongroup.com',
    password: 'password123'
  });
  
  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  
  console.log("Logged in as:", authData.user.email);
  
  // Fetch profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, email');
    
  if (error) {
    console.error("Query failed:", error.message);
    return;
  }
  
  console.log("Profiles visible to admin:", data);
}

checkProfiles();
