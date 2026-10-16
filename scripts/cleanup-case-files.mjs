// Optional administrative worker. Supply credentials through the process environment.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url=process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno del terminal o del job privado.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const result=await client.from('case_file_cleanup').select('id,bucket,file_path').eq('bucket','case-files').order('created_at').limit(100);
if(result.error)throw new Error(result.error.message);
let removed=0,retained=0;
for(const item of result.data){
  const referenced=await client.rpc('xapcon_case_file_referenced',{p_bucket:item.bucket,p_path:item.file_path});
  if(referenced.error)throw new Error('No se pudo verificar que el archivo esté sin referencias. No se eliminó.');
  if(referenced.data){retained++;continue;}
  const deletion=await client.storage.from(item.bucket).remove([item.file_path]);
  if(deletion.error)throw new Error('La limpieza de Storage falló. El trabajo pendiente permanece en la cola.');
  const finished=await client.rpc('finish_xapcon_file_cleanup',{p_cleanup_id:item.id});
  if(finished.error)throw new Error('El borrado no se pudo confirmar todavía. La cola conserva el registro para reintentar.');
  removed++;
}
console.log(JSON.stringify({removed,retainedForLiveReferences:retained}));
