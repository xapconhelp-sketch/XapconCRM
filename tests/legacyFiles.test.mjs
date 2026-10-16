import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLegacyCase, legacyPaths, migratedPath } from '../scripts/lib/legacyFiles.mjs';
import { leadSummarySelect, preserveCaseDocuments } from '../src/lib/leadQueries.js';

test('legacy migration preserves notes and external links while replacing owned file references',async()=>{
  const project='https://example.supabase.co';
  const row={id:'claim',documents:[{id:'a',name:'contract',filePath:'claim/a.pdf',url:`${project}/storage/v1/object/public/documents/claim/a.pdf`},{id:'external',url:'https://example.org/file.pdf'}],timeline:[{id:'note',content:'Preserve this note',photos:[`${project}/storage/v1/object/public/documents/timeline_images/a.png`,'https://example.org/photo.jpg']} ]};
  const next=await planLegacyCase(row,project,async(id,ref)=>`${id}/migrated/${ref.path.split('/').pop()}`);
  assert.deepEqual(next.documents[0],{id:'a',name:'contract',storageBucket:'case-files',filePath:'claim/migrated/a.pdf'});
  assert.deepEqual(next.documents[1],row.documents[1]);
  assert.equal(next.timeline[0].content,'Preserve this note');
  assert.deepEqual(next.timeline[0].photos,['storage://case-files/claim/migrated/a.png','https://example.org/photo.jpg']);
  assert.ok(row.documents[0].url);
});
test('retirement inventory detects references in branding, avatars and legacy document objects',()=>{
  const project='https://example.supabase.co';
  const paths=legacyPaths([{logo_url:`${project}/storage/v1/object/public/documents/brand/logo.png`},{documents:[{filePath:'claim/a.pdf'}]}],project);
  assert.deepEqual([...paths].sort(),['brand/logo.png','claim/a.pdf']);
  assert.equal(legacyPaths({filePath:'claim/private.pdf',storageBucket:'case-files'},project).size,0);
});
test('migration destinations are deterministic and change when source bytes change',()=>{
  const a=migratedPath('claim','source.pdf',Buffer.from('one'));
  assert.equal(a,migratedPath('claim','source.pdf',Buffer.from('one')));
  assert.notEqual(a,migratedPath('claim','source.pdf',Buffer.from('two')));
  assert.match(a,/^claim\/migrated\/[a-f0-9]{64}\.pdf$/);
});
test('recurring lead queries omit attachments and retail estimates unless needed',()=>{
  assert.equal(leadSummarySelect().includes('documents'),false);
  assert.equal(leadSummarySelect().split(',').includes('estimate'),false);
  assert.equal(leadSummarySelect(true).split(',').includes('estimate'),true);
  const docs=[{id:'a'}];
  assert.equal(preserveCaseDocuments([{id:'claim',documents:docs}],[{id:'claim',name:'updated'}])[0].documents,docs);
  // The detail request may finish before the initial summary request.
  assert.equal(preserveCaseDocuments([],[{id:'claim'}],new Map([['claim',docs]]))[0].documents,docs);
});
