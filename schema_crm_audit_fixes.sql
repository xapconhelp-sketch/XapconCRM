-- Apply AFTER schema_auth_membership_complete.sql and schema_task_workflow.sql.
-- Supabase SQL Editor. Run the entire file. Safe to reapply.
BEGIN;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimate JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]';
UPDATE public.leads SET documents='[]' WHERE documents IS NULL OR documents::jsonb='null'::jsonb;
UPDATE public.leads SET timeline='[]' WHERE timeline IS NULL OR timeline::jsonb='null'::jsonb;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.leads WHERE estimate IS NOT NULL AND jsonb_typeof(estimate::jsonb) NOT IN ('object','null'))
    THEN RAISE EXCEPTION 'Hay estimaciones con formato inválido. Revísalas antes de migrar; no se modificó ningún registro.'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_estimate_private (
  lead_id UUID PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  private_fields JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_estimate_private ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_estimate_private FROM anon, authenticated;
GRANT SELECT ON public.admin_estimate_private TO authenticated;
DROP POLICY IF EXISTS admin_estimate_private_read ON public.admin_estimate_private;
CREATE POLICY admin_estimate_private_read ON public.admin_estimate_private FOR SELECT TO authenticated
USING (public.is_xapcon_superadmin());

CREATE OR REPLACE FUNCTION public.public_xapcon_estimate(p_estimate JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN jsonb_typeof(p_estimate) = 'object' THEN coalesce((
    SELECT jsonb_object_agg(key, value) FROM jsonb_each(p_estimate)
    WHERE key = ANY(ARRAY['id','leadId','clientName','address','clientPhone','clientEmail','status',
      'items','subtotalMaterials','subtotalLabor','subtotalFees','baseFee','subtotalGross','taxRate',
      'taxAmount','total','termsAndCommitment','warrantyType','warrantyTypes'])
  ), '{}'::jsonb) ELSE NULL END;
$$;

-- Archive the private fields before removing them from the shared lead row.
INSERT INTO public.admin_estimate_private(lead_id, private_fields)
SELECT id, estimate::jsonb - ARRAY(SELECT jsonb_object_keys(public.public_xapcon_estimate(estimate::jsonb)))
FROM public.leads WHERE jsonb_typeof(estimate::jsonb) = 'object'
  AND estimate::jsonb <> public.public_xapcon_estimate(estimate::jsonb)
ON CONFLICT(lead_id) DO UPDATE SET private_fields = admin_estimate_private.private_fields || excluded.private_fields;
UPDATE public.leads SET estimate = public.public_xapcon_estimate(estimate::jsonb)
WHERE estimate IS NOT NULL AND estimate::jsonb IS DISTINCT FROM public.public_xapcon_estimate(estimate::jsonb);

CREATE OR REPLACE FUNCTION public.protect_xapcon_estimate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE shared JSONB; hidden JSONB;
BEGIN
  shared := public.public_xapcon_estimate(NEW.estimate::jsonb);
  IF public.is_xapcon_superadmin() AND shared IS NOT NULL THEN
    hidden := NEW.estimate::jsonb - ARRAY(SELECT jsonb_object_keys(shared));
    IF hidden <> '{}'::jsonb THEN
      INSERT INTO public.admin_estimate_private(lead_id, private_fields) VALUES(NEW.id, hidden)
      ON CONFLICT(lead_id) DO UPDATE SET private_fields = admin_estimate_private.private_fields || excluded.private_fields,
        updated_at = now();
    END IF;
  END IF;
  NEW.estimate := shared;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_xapcon_estimate ON public.leads;
CREATE TRIGGER protect_xapcon_estimate BEFORE INSERT OR UPDATE OF estimate ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.protect_xapcon_estimate();

CREATE TABLE IF NOT EXISTS public.case_file_cleanup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL CHECK(bucket IN ('documents','case-files')),
  file_path TEXT NOT NULL,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bucket, file_path)
);
ALTER TABLE public.case_file_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.case_file_cleanup FROM anon, authenticated;
GRANT SELECT ON public.case_file_cleanup TO authenticated;
DROP POLICY IF EXISTS case_file_cleanup_read ON public.case_file_cleanup;
CREATE POLICY case_file_cleanup_read ON public.case_file_cleanup FOR SELECT TO authenticated USING (
  public.is_xapcon_superadmin() OR (created_by = auth.uid() AND public.can_access_xapcon_org(organization_id))
);

CREATE OR REPLACE FUNCTION public.xapcon_case_file_referenced(p_bucket TEXT, p_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.documents::jsonb,'[]')) d
    WHERE d->>'filePath' = p_path AND coalesce(d->>'storageBucket','documents') = p_bucket
  ) OR EXISTS (
    SELECT 1 FROM public.leads l CROSS JOIN LATERAL jsonb_array_elements(coalesce(l.timeline::jsonb,'[]')) e
    CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(e->'photos')='array' THEN e->'photos' ELSE '[]'::jsonb END) photo
    WHERE photo = 'storage://' || p_bucket || '/' || p_path
  );
$$;

CREATE OR REPLACE FUNCTION public.append_xapcon_case_documents(p_lead_id UUID, p_documents JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; doc JSONB; existing JSONB; items JSONB;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  IF jsonb_typeof(p_documents) IS DISTINCT FROM 'array' OR jsonb_array_length(p_documents) NOT BETWEEN 1 AND 20
    THEN RAISE EXCEPTION 'Selecciona entre 1 y 20 documentos.'; END IF;
  items := coalesce(l.documents::jsonb,'[]');
  FOR doc IN SELECT value FROM jsonb_array_elements(p_documents) LOOP
    IF nullif(doc->>'id','') IS NULL OR nullif(doc->>'name','') IS NULL OR doc->>'storageBucket' IS DISTINCT FROM 'case-files'
      OR left(coalesce(doc->>'filePath',''),37) <> p_lead_id::text || '/'
      OR doc->>'filePath' ~ '(^|/)\.\.(/|$)' OR doc ? 'url'
      OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='case-files' AND name=doc->>'filePath')
      OR EXISTS(SELECT 1 FROM public.case_file_cleanup WHERE bucket='case-files' AND file_path=doc->>'filePath')
      THEN RAISE EXCEPTION 'Documento o ruta privada no válidos.'; END IF;
    SELECT value INTO existing FROM jsonb_array_elements(items) WHERE value->>'id'=doc->>'id';
    IF FOUND THEN
      IF existing <> doc THEN RAISE EXCEPTION 'El identificador del documento ya existe.'; END IF;
    ELSE items := jsonb_build_array(doc) || items;
    END IF;
  END LOOP;
  UPDATE public.leads SET documents=items WHERE id=l.id;
  RETURN items;
END $$;

CREATE OR REPLACE FUNCTION public.remove_xapcon_case_document(p_lead_id UUID, p_document_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; doc JSONB; items JSONB; cleanup UUID;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  SELECT value INTO doc FROM jsonb_array_elements(coalesce(l.documents::jsonb,'[]')) WHERE value->>'id'=p_document_id;
  IF doc IS NULL THEN RETURN jsonb_build_object('documents',coalesce(l.documents::jsonb,'[]')); END IF;
  SELECT coalesce(jsonb_agg(value ORDER BY ordinality),'[]') INTO items
  FROM jsonb_array_elements(l.documents::jsonb) WITH ORDINALITY WHERE value->>'id' IS DISTINCT FROM p_document_id;
  UPDATE public.leads SET documents=items WHERE id=l.id;
  IF nullif(doc->>'filePath','') IS NOT NULL AND coalesce(doc->>'storageBucket','documents') IN ('documents','case-files')
    AND NOT public.xapcon_case_file_referenced(coalesce(doc->>'storageBucket','documents'),doc->>'filePath')
    AND (coalesce(doc->>'storageBucket','documents')='documents' OR left(doc->>'filePath',37)=l.id::text || '/') THEN
    INSERT INTO public.case_file_cleanup(claim_id,organization_id,bucket,file_path)
    VALUES(l.id,l.organization_id,coalesce(doc->>'storageBucket','documents'),doc->>'filePath')
    ON CONFLICT(bucket,file_path) DO UPDATE SET claim_id=excluded.claim_id RETURNING id INTO cleanup;
  END IF;
  RETURN jsonb_build_object('documents',items,'cleanup_id',cleanup);
END $$;

CREATE OR REPLACE FUNCTION public.queue_xapcon_orphan_file(p_lead_id UUID, p_file_path TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; cleanup UUID;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id)
    OR left(p_file_path,37) <> p_lead_id::text || '/' THEN RAISE EXCEPTION 'Ruta no autorizada.'; END IF;
  IF public.xapcon_case_file_referenced('case-files',p_file_path) THEN RETURN NULL; END IF;
  INSERT INTO public.case_file_cleanup(claim_id,organization_id,bucket,file_path) VALUES(l.id,l.organization_id,'case-files',p_file_path)
  ON CONFLICT(bucket,file_path) DO UPDATE SET claim_id=excluded.claim_id RETURNING id INTO cleanup;
  RETURN cleanup;
END $$;

CREATE OR REPLACE FUNCTION public.finish_xapcon_file_cleanup(p_cleanup_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE item public.case_file_cleanup%ROWTYPE;
BEGIN
  SELECT * INTO item FROM public.case_file_cleanup WHERE id=p_cleanup_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.is_xapcon_superadmin() AND coalesce(auth.jwt()->>'role','') <> 'service_role'
    AND (item.created_by IS DISTINCT FROM auth.uid() OR NOT public.can_access_xapcon_org(item.organization_id))
    THEN RAISE EXCEPTION 'No tienes acceso a esta limpieza.'; END IF;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=item.bucket AND name=item.file_path)
    THEN RAISE EXCEPTION 'El archivo todavía existe en Storage.'; END IF;
  DELETE FROM public.case_file_cleanup WHERE id=item.id;
END $$;

-- A queued file cannot be attached again while a Storage deletion is running.
-- Only newly added references are checked so a damaged old attachment can still
-- be removed without blocking repairs to the rest of the case.
CREATE OR REPLACE FUNCTION public.guard_xapcon_private_file_links()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE doc JSONB; photo TEXT; object_path TEXT;
BEGIN
  FOR doc IN SELECT value FROM jsonb_array_elements(coalesce(NEW.documents::jsonb,'[]')) LOOP
    IF doc->>'storageBucket'='case-files' AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(CASE WHEN TG_OP='INSERT' THEN '[]'::jsonb ELSE coalesce(OLD.documents::jsonb,'[]') END) old_doc
      WHERE old_doc->>'storageBucket'='case-files' AND old_doc->>'filePath'=doc->>'filePath') THEN
      object_path := doc->>'filePath';
      IF left(coalesce(object_path,''),37) <> NEW.id::text || '/'
        OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='case-files' AND name=object_path)
        OR EXISTS(SELECT 1 FROM public.case_file_cleanup WHERE bucket='case-files' AND file_path=object_path)
        THEN RAISE EXCEPTION 'El archivo privado no está disponible para adjuntar.'; END IF;
    END IF;
  END LOOP;
  FOR photo IN SELECT photos.value FROM jsonb_array_elements(coalesce(NEW.timeline::jsonb,'[]')) e
    CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(e->'photos')='array' THEN e->'photos' ELSE '[]'::jsonb END) AS photos(value)
  LOOP
    IF left(photo,length('storage://case-files/'))='storage://case-files/' AND NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(CASE WHEN TG_OP='INSERT' THEN '[]'::jsonb ELSE coalesce(OLD.timeline::jsonb,'[]') END) old_event
      CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(old_event->'photos')='array' THEN old_event->'photos' ELSE '[]'::jsonb END) old_photo WHERE old_photo=photo) THEN
      object_path := substring(photo from length('storage://case-files/')+1);
      IF left(object_path,37) <> NEW.id::text || '/'
        OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='case-files' AND name=object_path)
        OR EXISTS(SELECT 1 FROM public.case_file_cleanup WHERE bucket='case-files' AND file_path=object_path)
        THEN RAISE EXCEPTION 'La foto privada no está disponible para adjuntar.'; END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_xapcon_private_file_links ON public.leads;
CREATE TRIGGER guard_xapcon_private_file_links BEFORE INSERT OR UPDATE OF documents,timeline ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.guard_xapcon_private_file_links();

-- Keep file cleanup durable when a note or the entire case is deleted.
CREATE OR REPLACE FUNCTION public.queue_xapcon_removed_case_files()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE removed_path TEXT; doc JSONB;
BEGIN
  IF TG_OP='DELETE' THEN
    FOR doc IN SELECT value FROM jsonb_array_elements(coalesce(OLD.documents::jsonb,'[]')) LOOP
      IF doc->>'storageBucket'='case-files' AND left(doc->>'filePath',37)=OLD.id::text || '/'
        AND NOT public.xapcon_case_file_referenced('case-files',doc->>'filePath') THEN
        INSERT INTO public.case_file_cleanup(claim_id,organization_id,bucket,file_path)
        VALUES(NULL,OLD.organization_id,'case-files',doc->>'filePath') ON CONFLICT(bucket,file_path) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  FOR removed_path IN SELECT substring(photo from length('storage://case-files/')+1)
    FROM jsonb_array_elements(coalesce(OLD.timeline::jsonb,'[]')) e
    CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(e->'photos')='array' THEN e->'photos' ELSE '[]'::jsonb END) photo
    WHERE left(photo,length('storage://case-files/'))='storage://case-files/'
  LOOP
    IF left(removed_path,37)=OLD.id::text || '/' AND NOT public.xapcon_case_file_referenced('case-files',removed_path) THEN
      INSERT INTO public.case_file_cleanup(claim_id,organization_id,bucket,file_path)
      VALUES(CASE WHEN TG_OP='DELETE' THEN NULL ELSE OLD.id END,OLD.organization_id,'case-files',removed_path)
      ON CONFLICT(bucket,file_path) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS queue_xapcon_removed_case_files ON public.leads;
CREATE TRIGGER queue_xapcon_removed_case_files AFTER UPDATE OF timeline OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.queue_xapcon_removed_case_files();
CREATE INDEX IF NOT EXISTS case_file_cleanup_creator_created ON public.case_file_cleanup(created_by,created_at);

-- Used only by the manually run legacy migration tool. Compare-and-swap both
-- JSON arrays so an edit made while files are copied is never overwritten.
CREATE OR REPLACE FUNCTION public.migrate_xapcon_legacy_case_files(
  p_lead_id UUID, p_expected_documents JSONB, p_expected_timeline JSONB,
  p_documents JSONB, p_timeline JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE l public.leads%ROWTYPE;
BEGIN
  IF NOT public.is_xapcon_superadmin() AND coalesce(auth.jwt()->>'role','') <> 'service_role'
    THEN RAISE EXCEPTION 'Solo un administrador puede migrar archivos históricos.'; END IF;
  SELECT * INTO l FROM public.leads WHERE id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El caso ya no existe.'; END IF;
  IF coalesce(l.documents::jsonb,'[]') IS DISTINCT FROM p_expected_documents
    OR coalesce(l.timeline::jsonb,'[]') IS DISTINCT FROM p_expected_timeline
    THEN RAISE EXCEPTION 'El caso cambió durante la copia. Repite la migración para este caso.'; END IF;
  IF jsonb_typeof(p_documents) IS DISTINCT FROM 'array' OR jsonb_typeof(p_timeline) IS DISTINCT FROM 'array'
    THEN RAISE EXCEPTION 'Referencias de archivo no válidas.'; END IF;
  UPDATE public.leads SET documents=p_documents,timeline=p_timeline WHERE id=l.id;
END $$;

REVOKE UPDATE ON public.leads FROM authenticated;
REVOKE UPDATE(documents) ON public.leads FROM authenticated;
DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='leads' AND column_name NOT IN ('documents','tasks','timeline')
  LOOP EXECUTE format('GRANT UPDATE (%I) ON public.leads TO authenticated',c.column_name); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.guard_xapcon_initial_documents()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND coalesce(NEW.documents::jsonb,'[]') <> '[]'::jsonb
    THEN RAISE EXCEPTION 'Adjunta los documentos mediante la operación autorizada.'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_xapcon_initial_documents ON public.leads;
CREATE TRIGGER guard_xapcon_initial_documents BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.guard_xapcon_initial_documents();

INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES('case-files','case-files',false,26214400)
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=26214400;
CREATE OR REPLACE FUNCTION public.can_access_xapcon_case_file(p_path TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.leads l
    WHERE l.id::text=split_part(p_path,'/',1) AND public.can_access_xapcon_org(l.organization_id))
    OR (auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.case_file_cleanup c WHERE c.bucket='case-files' AND c.file_path=p_path
      AND (public.is_xapcon_superadmin() OR (c.created_by=auth.uid() AND public.can_access_xapcon_org(c.organization_id)))));

$$;
DROP POLICY IF EXISTS xapcon_private_case_files_read ON storage.objects;
DROP POLICY IF EXISTS xapcon_private_case_files_insert ON storage.objects;
DROP POLICY IF EXISTS xapcon_private_case_files_delete ON storage.objects;
CREATE POLICY xapcon_private_case_files_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='case-files' AND public.can_access_xapcon_case_file(name)
);
CREATE POLICY xapcon_private_case_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id='case-files' AND name !~ '(^|/)\.\.(/|$)' AND public.can_access_xapcon_case_file(name)
);
CREATE POLICY xapcon_private_case_files_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='case-files' AND NOT public.xapcon_case_file_referenced(bucket_id,name)
  AND EXISTS(SELECT 1 FROM public.case_file_cleanup WHERE bucket=bucket_id AND file_path=name)
  AND (public.is_xapcon_superadmin() OR public.can_access_xapcon_case_file(name))
);

-- Old broad storage policies are permissive (OR). Restrictive guards win.
DROP POLICY IF EXISTS xapcon_case_files_read_guard ON storage.objects;
DROP POLICY IF EXISTS xapcon_case_files_insert_guard ON storage.objects;
DROP POLICY IF EXISTS xapcon_case_files_delete_guard ON storage.objects;
DROP POLICY IF EXISTS xapcon_case_files_update_guard ON storage.objects;
DROP POLICY IF EXISTS xapcon_case_files_anon_delete_guard ON storage.objects;
CREATE POLICY xapcon_case_files_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
USING (bucket_id <> 'case-files' OR public.can_access_xapcon_case_file(name));
CREATE POLICY xapcon_case_files_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
WITH CHECK (bucket_id <> 'case-files' OR (name !~ '(^|/)\.\.(/|$)' AND public.can_access_xapcon_case_file(name)));
CREATE POLICY xapcon_case_files_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'case-files' OR (NOT public.xapcon_case_file_referenced(bucket_id,name)
  AND EXISTS(SELECT 1 FROM public.case_file_cleanup WHERE bucket=bucket_id AND file_path=name)
  AND (public.is_xapcon_superadmin() OR public.can_access_xapcon_case_file(name))));
CREATE POLICY xapcon_case_files_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
USING (bucket_id <> 'case-files') WITH CHECK (bucket_id <> 'case-files');
CREATE POLICY xapcon_case_files_anon_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon
USING (bucket_id <> 'case-files');

-- Keep historical 'documents' unchanged: public branding and legacy case files
-- can be mixed in it. Follow the separate legacy migration guide before closing it.
DO $$ DECLARE f REGPROCEDURE; BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('public_xapcon_estimate','protect_xapcon_estimate',
      'xapcon_case_file_referenced','append_xapcon_case_documents','remove_xapcon_case_document',
      'queue_xapcon_orphan_file','finish_xapcon_file_cleanup','guard_xapcon_initial_documents','can_access_xapcon_case_file',
      'migrate_xapcon_legacy_case_files','queue_xapcon_removed_case_files','guard_xapcon_private_file_links')
  LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon',f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f);
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f);
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.can_access_xapcon_case_file(TEXT) TO anon;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    GRANT SELECT ON public.case_file_cleanup TO service_role;
  END IF;
END $$;
COMMIT;
