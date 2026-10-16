import { createHash } from 'node:crypto';
import { storageReference } from '../../src/services/caseFiles.js';

export function legacyDocumentReference(doc, projectUrl) {
  if (doc.filePath && (!doc.storageBucket || doc.storageBucket === 'documents')) return { bucket: 'documents', path: doc.filePath };
  const ref = storageReference(doc.url, projectUrl);
  return ref?.bucket === 'documents' ? ref : null;
}

export async function planLegacyCase(row, projectUrl, copyFile) {
  const documents = [];
  for (const doc of row.documents || []) {
    const ref = legacyDocumentReference(doc, projectUrl);
    if (!ref) { documents.push(doc); continue; }
    const filePath = await copyFile(row.id, ref);
    const { url: _oldUrl, ...rest } = doc;
    documents.push({ ...rest, storageBucket: 'case-files', filePath });
  }
  const timeline = [];
  for (const event of row.timeline || []) {
    if (!event.photos) { timeline.push(event); continue; }
    if (!Array.isArray(event.photos)) throw new Error("Hay fotos con formato inválido en un evento. Revísalo antes de migrar.");
    const photos = [];
    for (const photo of event.photos) {
      const ref = storageReference(photo, projectUrl);
      photos.push(ref?.bucket === 'documents' ? `storage://case-files/${await copyFile(row.id, ref)}` : photo);
    }
    timeline.push({ ...event, photos });
  }
  return { documents, timeline };
}

export function legacyPaths(value, projectUrl, result = new Set()) {
  if (typeof value === 'string') {
    const ref = storageReference(value, projectUrl);
    if (ref?.bucket === 'documents') result.add(ref.path);
  } else if (Array.isArray(value)) {
    for (const item of value) legacyPaths(item, projectUrl, result);
  } else if (value && typeof value === 'object') {
    const ref = legacyDocumentReference(value, projectUrl);
    if (ref) result.add(ref.path);
    for (const item of Object.values(value)) legacyPaths(item, projectUrl, result);
  }
  return result;
}

export function migratedPath(claimId, sourcePath, bytes) {
  const digest = createHash('sha256').update(sourcePath).update(bytes).digest('hex');
  const extension = sourcePath.split('.').pop()?.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'bin';
  return `${claimId}/migrated/${digest}.${extension}`;
}
