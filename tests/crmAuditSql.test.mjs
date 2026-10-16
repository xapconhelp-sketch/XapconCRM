import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('audit migration protects private estimates, files and atomic document operations', async t => {
  const db = new PGlite();
  const admin='00000000-0000-4000-8000-000000000001';
  const user='00000000-0000-4000-8000-000000000002';
  const outsider='00000000-0000-4000-8000-000000000003';
  const org='10000000-0000-4000-8000-000000000001';
  const otherOrg='10000000-0000-4000-8000-000000000002';
  const claim='20000000-0000-4000-8000-000000000001';
  const otherClaim='20000000-0000-4000-8000-000000000002';
  const sql=async (query,params=[]) => (await db.query(query,params)).rows;
  const actor=async(id,action) => {
    await sql("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);
    await db.exec('SET ROLE authenticated');
    try{return await action();}finally{await db.exec('RESET ROLE');await sql("SELECT set_config('request.jwt.claim.sub','',false)");}
  };
  const doc=(id) => ({id,name:`${id}.pdf`,size:'1 MB',category:'Reporte',storageBucket:'case-files',filePath:`${claim}/${id}.pdf`});
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
      CREATE TABLE public.profiles(id UUID PRIMARY KEY, role TEXT);
      CREATE TABLE public.organizations(id UUID PRIMARY KEY);
      CREATE TABLE public.user_organizations(user_id UUID,organization_id UUID);
      CREATE TABLE public.leads(id UUID PRIMARY KEY,organization_id UUID,estimate JSONB,documents JSONB DEFAULT '[]',timeline JSONB DEFAULT '[]');
      CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT);
      CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid() PRIMARY KEY,bucket_id TEXT,name TEXT,UNIQUE(bucket_id,name));
      CREATE FUNCTION public.is_xapcon_superadmin() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
        SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='super_admin') $$;
      CREATE FUNCTION public.can_access_xapcon_org(p_org_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
        SELECT auth.uid() IS NOT NULL AND (public.is_xapcon_superadmin() OR EXISTS(SELECT 1 FROM user_organizations WHERE user_id=auth.uid() AND organization_id=p_org_id)) $$;
      GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated;
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.leads,storage.objects TO authenticated;
      GRANT SELECT,DELETE ON storage.objects TO anon;
      GRANT UPDATE(estimate,documents) ON public.leads TO authenticated;
      ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
      CREATE POLICY tenant ON public.leads TO authenticated USING(public.can_access_xapcon_org(organization_id)) WITH CHECK(public.can_access_xapcon_org(organization_id));
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      -- Simulate an old dangerously broad policy: the new restrictive guards must win.
      CREATE POLICY legacy_broad ON storage.objects TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY legacy_anon ON storage.objects TO anon USING(true) WITH CHECK(true);
      INSERT INTO profiles VALUES('${admin}','super_admin'),('${user}','employee'),('${outsider}','employee');
      INSERT INTO organizations VALUES('${org}'),('${otherOrg}');
      INSERT INTO user_organizations VALUES('${user}','${org}'),('${outsider}','${otherOrg}');
      INSERT INTO leads(id,organization_id,estimate) VALUES('${claim}','${org}','{"total":100,"profitMargin":32,"internalCost":68}'),('${otherClaim}','${otherOrg}',NULL);
    `);
    const migration=await readFile(new URL('../schema_crm_audit_fixes.sql',import.meta.url),'utf8');
    await db.exec(migration);

    await t.test('backfill removes internal values from the shared row and preserves them for admin',async()=>{
      assert.deepEqual((await actor(user,()=>sql('SELECT estimate FROM leads WHERE id=$1',[claim])))[0].estimate,{total:100});
      assert.equal((await actor(user,()=>sql('SELECT * FROM admin_estimate_private'))).length,0);
      assert.deepEqual((await actor(admin,()=>sql('SELECT private_fields FROM admin_estimate_private')))[0].private_fields,{profitMargin:32,internalCost:68});
      await assert.rejects(actor(user,()=>sql('UPDATE admin_estimate_private SET private_fields=$1',['{}'])),/permission denied/i);
    });
    await t.test('contractor writes cannot expose or overwrite private margins',async()=>{
      await actor(user,()=>sql('UPDATE leads SET estimate=$1 WHERE id=$2',[JSON.stringify({total:120,profitMargin:99,internalCost:1}),claim]));
      assert.deepEqual((await sql('SELECT estimate FROM leads WHERE id=$1',[claim]))[0].estimate,{total:120});
      assert.equal((await sql('SELECT private_fields FROM admin_estimate_private WHERE lead_id=$1',[claim]))[0].private_fields.profitMargin,32);
      await actor(admin,()=>sql('UPDATE leads SET estimate=$1 WHERE id=$2',[JSON.stringify({total:150,profitMargin:40}),claim]));
      assert.equal((await sql('SELECT private_fields FROM admin_estimate_private WHERE lead_id=$1',[claim]))[0].private_fields.profitMargin,40);
    });
    await t.test('new lead inserts preserve admin-only fields through the deferred foreign key',async()=>{
      const newLead='20000000-0000-4000-8000-000000000003';
      await actor(admin,()=>sql('INSERT INTO leads(id,organization_id,estimate) VALUES($1,$2,$3)',[newLead,org,'{"total":200,"profitMargin":35}']));
      assert.equal((await sql('SELECT private_fields FROM admin_estimate_private WHERE lead_id=$1',[newLead]))[0].private_fields.profitMargin,35);
      await assert.rejects(actor(user,()=>sql('INSERT INTO leads(id,organization_id,documents) VALUES($1,$2,$3)',['20000000-0000-4000-8000-000000000004',org,'[{"id":"bypass"}]'])),/autorizada/i);
    });
    await t.test('private bucket is tenant-scoped even with a broad old policy',async()=>{
      await sql('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2),($1,$3)',['case-files',`${claim}/a.pdf`,`${otherClaim}/other.pdf`]);
      const rows=await actor(user,()=>sql('SELECT name FROM storage.objects'));
      assert.deepEqual(rows.map(r=>r.name),[`${claim}/a.pdf`]);
      await assert.rejects(actor(outsider,()=>sql('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)',['case-files',`${claim}/intruder.pdf`])),/row-level security/i);
      await db.exec('SET ROLE anon');
      try {
        assert.equal((await sql("SELECT * FROM storage.objects WHERE bucket_id='case-files'")).length,0);
        assert.equal((await sql('DELETE FROM storage.objects RETURNING name')).length,0);
      }
      finally { await db.exec('RESET ROLE'); }
      assert.equal((await sql("SELECT public FROM storage.buckets WHERE id='case-files'"))[0].public,false);
    });
    await t.test('append preserves earlier updates, is idempotent and denies direct/cross-tenant writes',async()=>{
      await sql('UPDATE leads SET timeline=$1 WHERE id=$2',[JSON.stringify([{id:'legacy-null-photo',photos:null}]),claim]);
      await sql('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)',['case-files',`${claim}/b.pdf`]);
      await actor(user,()=>sql('SELECT append_xapcon_case_documents($1,$2)',[claim,JSON.stringify([doc('a')])]));
      await actor(user,()=>sql('SELECT append_xapcon_case_documents($1,$2)',[claim,JSON.stringify([doc('b')])]));
      await actor(user,()=>sql('SELECT append_xapcon_case_documents($1,$2)',[claim,JSON.stringify([doc('a')])]));
      assert.deepEqual((await sql('SELECT documents FROM leads WHERE id=$1',[claim]))[0].documents.map(d=>d.id),['b','a']);
      await assert.rejects(actor(user,()=>sql("UPDATE leads SET documents='[]' WHERE id=$1",[claim])),/permission denied/i);
      await assert.rejects(actor(outsider,()=>sql('SELECT remove_xapcon_case_document($1,$2)',[claim,'a'])),/acceso/i);
      await assert.rejects(actor(user,()=>sql('SELECT append_xapcon_case_documents($1,$2)',[claim,JSON.stringify([{...doc('x'),filePath:`${otherClaim}/other.pdf`}])])),/válidos/i);
      assert.equal((await actor(user,()=>sql("DELETE FROM storage.objects WHERE name=$1 RETURNING name",[`${claim}/a.pdf`]))).length,0);
      assert.equal((await actor(user,()=>sql("UPDATE storage.objects SET name=$1 WHERE name=$2 RETURNING name",[`${claim}/renamed.pdf`,`${claim}/a.pdf`]))).length,0);
    });
    await t.test('removal schedules durable cleanup and cannot acknowledge a file that still exists',async()=>{
      const [result]=await actor(user,()=>sql('SELECT remove_xapcon_case_document($1,$2) AS result',[claim,'a']));
      const cleanupId=result.result.cleanup_id;
      assert.ok(cleanupId);
      assert.deepEqual(result.result.documents.map(d=>d.id),['b']);
      await assert.rejects(actor(user,()=>sql('SELECT finish_xapcon_file_cleanup($1)',[cleanupId])),/todavía existe/i);
      assert.equal((await actor(outsider,()=>sql('SELECT * FROM case_file_cleanup'))).length,0);
      await actor(user,()=>sql('DELETE FROM storage.objects WHERE name=$1',[`${claim}/a.pdf`]));
      await actor(user,()=>sql('SELECT finish_xapcon_file_cleanup($1)',[cleanupId]));
      assert.equal((await sql('SELECT * FROM case_file_cleanup')).length,0);
    });
    await t.test('a lost append response never schedules deletion of a committed file',async()=>{
      const [result]=await actor(user,()=>sql('SELECT queue_xapcon_orphan_file($1,$2) AS id',[claim,`${claim}/b.pdf`]));
      assert.equal(result.id,null);
      await sql('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)',['case-files',`${claim}/orphan.pdf`]);
      const [orphan]=await actor(user,()=>sql('SELECT queue_xapcon_orphan_file($1,$2) AS id',[claim,`${claim}/orphan.pdf`]));
      assert.ok(orphan.id);
      await assert.rejects(actor(user,()=>sql('SELECT append_xapcon_case_documents($1,$2)',[claim,JSON.stringify([doc('orphan')])])),/válidos/i);
    });
    await t.test('reapplying the migration preserves private values and references',async()=>{
      await db.exec(migration);
      assert.equal((await sql('SELECT private_fields FROM admin_estimate_private WHERE lead_id=$1',[claim]))[0].private_fields.profitMargin,40);
      assert.equal((await sql('SELECT documents FROM leads WHERE id=$1',[claim]))[0].documents.length,1);
    });
    await t.test('legacy migration denies contractors and refuses to overwrite a concurrently edited note',async()=>{
      const [{documents,timeline}]=await sql('SELECT documents,timeline FROM leads WHERE id=$1',[claim]);
      await assert.rejects(actor(user,()=>sql('SELECT migrate_xapcon_legacy_case_files($1,$2,$3,$4,$5)',[claim,JSON.stringify(documents),'[]','[]','[]'])),/administrador/i);
      await assert.rejects(actor(admin,()=>sql('SELECT migrate_xapcon_legacy_case_files($1,$2,$3,$4,$5)',[claim,'[]','[]','[]','[]'])),/cambió/i);
      await sql('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)',['case-files',`${claim}/photo.png`]);
      await actor(admin,()=>sql('SELECT migrate_xapcon_legacy_case_files($1,$2,$3,$4,$5)',[claim,JSON.stringify(documents),JSON.stringify(timeline),JSON.stringify(documents),'[{"id":"note","photos":["storage://case-files/'+claim+'/photo.png"]}]']));
    });
    await t.test('deleting a complete case retains cleanup access for its company without exposing it to outsiders',async()=>{
      await actor(user,()=>sql('DELETE FROM leads WHERE id=$1',[claim]));
      const queue=await actor(user,()=>sql("SELECT * FROM case_file_cleanup WHERE bucket='case-files'"));
      assert.ok(queue.some(item=>item.file_path===`${claim}/b.pdf` && item.claim_id===null));
      assert.ok(queue.some(item=>item.file_path===`${claim}/photo.png`));
      assert.equal((await actor(outsider,()=>sql('SELECT * FROM case_file_cleanup'))).length,0);
      const removed=await actor(user,()=>sql('DELETE FROM storage.objects WHERE name=$1 RETURNING name',[`${claim}/photo.png`]));
      assert.equal(removed.length,1);
    });
  } finally { await db.close(); }
});
