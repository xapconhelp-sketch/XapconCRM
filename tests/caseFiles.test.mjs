import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCaseFileService, storageReference } from '../src/services/caseFiles.js';
import { publicEstimate } from '../src/lib/estimatePrivacy.js';

test('contractor estimate objects exclude all private top-level fields',()=>{
  assert.deepEqual(publicEstimate({id:'estimate',total:100,profitMargin:30,internalCost:70,secret:'private'}),{id:'estimate',total:100});
  assert.equal(publicEstimate(null),null);
});
test('storage references accept only this project and decode historical filenames',()=>{
  const project='https://example.supabase.co';
  assert.deepEqual(storageReference(`${project}/storage/v1/object/public/documents/claim/a%20b.pdf`,project),{bucket:'documents',path:'claim/a b.pdf'});
  assert.deepEqual(storageReference('storage://case-files/claim/a.pdf',project),{bucket:'case-files',path:'claim/a.pdf'});
  assert.equal(storageReference('https://attacker.test/storage/v1/object/public/documents/a.pdf',project),null);
  assert.equal(storageReference('javascript:alert(1)',project),null);
});
test('private file access is signed on demand and never falls back to a public URL on failure',async()=>{
  const signed=[];
  const service=createCaseFileService({storage:{from:bucket=>({createSignedUrl:async(path,seconds)=>{
    signed.push({bucket,path,seconds});return {data:{signedUrl:'https://example.supabase.co/signed'},error:null};
  }})}},'https://example.supabase.co');
  assert.match(await service.url({storageBucket:'case-files',filePath:'claim/a.pdf'}),/signed/);
  assert.deepEqual(signed,[{bucket:'case-files',path:'claim/a.pdf',seconds:60}]);
  const failed=createCaseFileService({storage:{from:()=>({createSignedUrl:async()=>({error:{message:'Forbidden'}})})}},'https://example.supabase.co');
  await assert.rejects(failed.url('https://example.supabase.co/storage/v1/object/public/documents/a.pdf'),/autorizar/);
  await assert.rejects(service.url({url:'javascript:alert(1)'}),/válida/);
});
test('cleanup retains failed deletions, skips legacy files and acknowledges only successful removals',async()=>{
  const removed=[];const ack=[];
  const service=createCaseFileService({
    from:()=>({select:()=>({order:()=>({limit:async()=>({data:[
      {id:'failed',bucket:'case-files',file_path:'a'},
      {id:'ok',bucket:'case-files',file_path:'b'},
      {id:'legacy',bucket:'documents',file_path:'legacy'}],error:null})})})}),
    storage:{from:bucket=>({remove:async paths=>{removed.push([bucket,paths]);return {error:paths[0]==='a'?{message:'offline'}:null};}})},
    rpc:async(name,args)=>{ack.push([name,args]);return {error:null};},
  },'https://example.supabase.co');
  await service.flushCleanup();
  assert.deepEqual(removed,[['case-files',['a']],['case-files',['b']]]);
  assert.deepEqual(ack,[['finish_xapcon_file_cleanup',{p_cleanup_id:'ok'}]]);
});
test('missing audit RPC gives a concrete migration instruction, without falling back to unsafe writes',async()=>{
  const service=createCaseFileService({rpc:async()=>({error:{code:'PGRST202',message:'Missing RPC'}})},'https://example.supabase.co');
  await assert.rejects(service.append('claim',[]),/schema_crm_audit_fixes.sql/);
  await assert.rejects(service.remove('claim','doc'),/schema_crm_audit_fixes.sql/);
});
