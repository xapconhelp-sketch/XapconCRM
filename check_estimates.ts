import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase URL or anon key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@xapcongroup.com',
    password: 'password123'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Logged in successfully as:", authData.user.email);

  const { data, error } = await supabase.from('leads').select('id, name, estimate');
  if (error) {
    console.error("Error fetching leads:", error);
    return;
  }
  
  console.log("LEADS ESTIMATE DATA:");
  data?.forEach(l => {
    console.log(`- Name: ${l.name}`);
    console.log(`  Estimate:`, JSON.stringify(l.estimate));
  });
}

run();
