// Manual tool: dry-run by default. Never runs during build, startup or tests.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { queryAll } from '../src/lib/queryAll.js';
import { planLegacyCase, legacyPaths, migratedPath } from './lib/legacyFiles.mjs';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY solo en el entorno del terminal. No uses una variable VITE_ para la clave privada.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes('--apply');
const retire = process.argv.includes('--retire-legacy-sources');
if (retire && !process.argv.includes('--maintenance-confirmed')) throw new Error('Cierra las sesiones y pausa las escrituras antes de retirar originales. Confirma el mantenimiento con --maintenance-confirmed.');
if (retire && !apply) throw new Error('Retirar originales requiere --apply --retire-legacy-sources. Primero migra y verifica las copias privadas.');
const directory = new URL('../.audit-local/', import.meta.url);
const manifestPath = new URL('legacy-files-manifest.json', directory);
let manifest = { sources: [], backups: [] };
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const save = async () => { await mkdir(directory, { recursive: true }); await writeFile(manifestPath, JSON.stringify(manifest, null, 2)); };
const rows = async (table, columns = '*') => {
  const result = await queryAll((from, to) => client.from(table).select(columns).order('id').range(from, to));
  if (result.error) throw new Error(`No se pudo inventariar ${table}: ${result.error.message}`);
  return result.data;
};
const leads = await rows('leads', 'id,documents,timeline');
let planned = 0, changed = 0;
const copied = new Map();
for (const lead of leads) {
  const copyFile = async (claimId, ref) => {
    planned++;
    if (!apply) return `${claimId}/dry-run`;
    const sourceKey = `${claimId}:${ref.path}`;
    if (copied.has(sourceKey)) return copied.get(sourceKey);
    const source = await client.storage.from('documents').download(ref.path);
    if (source.error || !source.data) throw new Error('No se pudo descargar un archivo histórico. No se modificaron sus referencias.');
    const bytes = Buffer.from(await source.data.arrayBuffer());
    const destination = migratedPath(claimId, ref.path, bytes);
    const uploaded = await client.storage.from('case-files').upload(destination, bytes, { upsert: false, contentType: source.data.type || 'application/octet-stream' });
    // Verify actual bytes, including when an earlier run already copied this file.
    const check = await client.storage.from('case-files').download(destination);
    if (check.error || !check.data || !Buffer.from(await check.data.arrayBuffer()).equals(bytes)) {
      throw new Error(`La copia privada no se pudo verificar. ${uploaded.error?.message || ''}`);
    }
    if (!manifest.sources.includes(ref.path)) manifest.sources.push(ref.path);
    await save();
    copied.set(sourceKey, destination);
    return destination;
  };
  const next = await planLegacyCase(lead, url, copyFile);
  if (JSON.stringify(next.documents) === JSON.stringify(lead.documents || []) && JSON.stringify(next.timeline) === JSON.stringify(lead.timeline || [])) continue;
  changed++;
  if (apply) {
    manifest.backups.push({ id: lead.id, documents: lead.documents || [], timeline: lead.timeline || [], savedAt: new Date().toISOString() });
    await save();
    const result = await client.rpc('migrate_xapcon_legacy_case_files', {
      p_lead_id: lead.id, p_expected_documents: lead.documents || [], p_expected_timeline: lead.timeline || [],
      p_documents: next.documents, p_timeline: next.timeline,
    });
    if (result.error) throw new Error(`No se actualizaron las referencias del caso: ${result.error.message}. Repite la ejecución; las copias y los originales se conservan.`);
  }
}
let retired = 0, retained = 0;
if (retire) {
  // Also inspect branding, avatars and every other string field before removing
  // a public original. Never make the mixed legacy bucket private blindly.
  const referenced = new Set();
  for (const table of ['leads', 'organizations', 'profiles']) legacyPaths(await rows(table), url, referenced);
  for (const source of manifest.sources) {
    if (referenced.has(source)) { retained++; continue; }
    const result = await client.storage.from('documents').remove([source]);
    if (result.error) throw new Error('No se pudo retirar un original. Repite la operación; las copias privadas permanecen disponibles.');
    retired++;
  }
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', cases: changed, fileReferences: planned, retired, retainedForOtherReferences: retained }));
