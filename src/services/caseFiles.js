export function storageReference(value, projectUrl) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('storage://case-files/')) return { bucket: 'case-files', path: value.slice('storage://case-files/'.length) };
  try {
    const url = new URL(value);
    if (url.origin !== new URL(projectUrl).origin) return null;
    const match = /^\/storage\/v1\/object\/(?:public|sign)\/(documents|case-files)\/(.+)$/.exec(url.pathname);
    return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
  } catch { return null; }
}

function rpcError(error) {
  return new Error(['PGRST202', 'PGRST205', '42P01'].includes(error.code)
    ? 'Falta aplicar schema_crm_audit_fixes.sql en Supabase antes de gestionar archivos.' : error.message);
}

export function createCaseFileService(client, projectUrl) {
  const reference = doc => doc.filePath
    ? { bucket: doc.storageBucket || 'documents', path: doc.filePath }
    : storageReference(doc.url, projectUrl);
  let cleanupRunning = false;
  return {
    reference,
    async upload(claimId, file, category = 'Reporte') {
      if (!/^[0-9a-f-]{36}$/i.test(claimId)) throw new Error('Selecciona un caso válido.');
      if (file.size > 25 * 1024 * 1024) throw new Error('Cada archivo debe pesar como máximo 25 MB.');
      const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'bin';
      const filePath = `${claimId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await client.storage.from('case-files').upload(filePath, file, { upsert: false });
      if (error) {
        // A failed response may still leave an uploaded object on the server.
        try { await client.rpc('queue_xapcon_orphan_file', { p_lead_id: claimId, p_file_path: filePath }); } catch { /* retry during inventory */ }
        throw new Error(`No se pudo subir ${file.name}. ${error.message}`);
      }
      return { id: crypto.randomUUID(), name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, category,
        storageBucket: 'case-files', filePath };
    },
    async append(claimId, documents) {
      const { data, error } = await client.rpc('append_xapcon_case_documents', { p_lead_id: claimId, p_documents: documents });
      if (error) throw rpcError(error);
      return data;
    },
    async remove(claimId, documentId) {
      const { data, error } = await client.rpc('remove_xapcon_case_document', { p_lead_id: claimId, p_document_id: documentId });
      if (error) throw rpcError(error);
      return data;
    },
    async queueOrphans(claimId, documents) {
      for (const doc of documents) {
        const ref = reference(doc);
        if (ref?.bucket !== 'case-files') continue;
        try {
          const { error } = await client.rpc('queue_xapcon_orphan_file', { p_lead_id: claimId, p_file_path: ref.path });
          if (error) console.warn('Limpieza pendiente de verificar:', error.message);
        } catch { console.warn('La limpieza pendiente requiere reintento.'); }
      }
    },
    async flushCleanup() {
      if (cleanupRunning) return;
      cleanupRunning = true;
      try {
        const { data, error } = await client.from('case_file_cleanup').select('id,bucket,file_path').order('created_at').limit(20);
        if (error) return;
        for (const item of data || []) {
          // Historical files can also be used by old branding/photos. The legacy
          // migration tool must verify every reference before deleting them.
          if (item.bucket !== 'case-files') continue;
          const result = await client.storage.from(item.bucket).remove([item.file_path]);
          if (!result.error) {
            const ack = await client.rpc('finish_xapcon_file_cleanup', { p_cleanup_id: item.id });
            if (ack.error) console.warn('No se pudo confirmar la limpieza:', ack.error.message);
          }
        }
      } catch (error) { console.warn('La limpieza de archivos se reintentará:', error instanceof Error ? error.message : error); }
      finally { cleanupRunning = false; }
    },
    async url(docOrPhoto) {
      const doc = typeof docOrPhoto === 'string' ? { url: docOrPhoto } : docOrPhoto;
      const ref = reference(doc);
      if (ref) {
        if (!['documents', 'case-files'].includes(ref.bucket)) throw new Error('Bucket de archivo no permitido.');
        const { data, error } = await client.storage.from(ref.bucket).createSignedUrl(ref.path, 60);
        if (error || !data?.signedUrl) throw new Error('No se pudo autorizar el acceso al archivo.');
        return data.signedUrl;
      }
      try { if (new URL(doc.url).protocol === 'https:') return doc.url; } catch { /* invalid reference */ }
      throw new Error('El archivo no tiene una referencia válida.');
    },
    async download(doc) {
      const ref = reference(doc);
      if (ref) {
        if (!['documents', 'case-files'].includes(ref.bucket)) throw new Error('Bucket de archivo no permitido.');
        const { data, error } = await client.storage.from(ref.bucket).download(ref.path);
        if (error) throw new Error('No se pudo descargar el documento.');
        return data;
      }
      const response = await fetch(await this.url(doc));
      if (!response.ok) throw new Error('No se pudo descargar el documento.');
      return response.blob();
    },
  };
}
