import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase URL or anon key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('leads').select('id, name, is_insurance_claim, tasks');
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(`Total records: ${data?.length}`);
  data?.forEach(l => {
    const tasks = l.tasks || [];
    const ids = tasks.map((t: any) => t.id);
    const uniqueIds = [...new Set(ids)];
    const hasDups = ids.length !== uniqueIds.length;
    console.log(`\n[${l.name}] (${l.id}) isClaim=${l.is_insurance_claim}`);
    console.log(`  Tasks count: ${tasks.length}${hasDups ? ' ⚠️ HAS DUPLICATE TASK IDs!' : ''}`);
    tasks.forEach((t: any, i: number) => {
      console.log(`  [${i}] id=${t.id} | status=${t.status} | title="${t.title}"`);
    });
  });
}

run();
