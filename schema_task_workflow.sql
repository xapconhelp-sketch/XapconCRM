-- Actualiza el RPC de tareas para aceptar las categorías del flujo nuevo y las actividades agendadas.
-- Seguro para ejecutar más de una vez; no modifica los registros actuales.
BEGIN;

CREATE OR REPLACE FUNCTION public.add_xapcon_task(p_lead_id UUID, p_title TEXT, p_assigned_to UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; task JSONB; items JSONB; author TEXT; recipient TEXT;
  kind TEXT := coalesce(p_details ->> 'kind', 'task'); due_date TEXT := coalesce(nullif(p_details ->> 'dueDate', ''), current_date::text);
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  IF nullif(trim(p_title), '') IS NULL OR length(trim(p_title)) > 120 THEN RAISE EXCEPTION 'La descripción debe tener entre 1 y 120 caracteres.'; END IF;
  IF kind NOT IN ('task', 'inspection', 'adjuster_meeting', 'installation', 'visit_homeowner', 'reinspection')
    OR coalesce(p_details ->> 'priority', 'medium') NOT IN ('high', 'medium', 'low')
    OR coalesce(p_details ->> 'category', 'general') NOT IN (
      'general', 'pending_document', 'visit_homeowner', 'call_homeowner', 'call_adjuster',
      'prepare_supplement', 'prepare_estimate', 'itel_followup', 'panel_contract_followup',
      'pending_coc', 'request_depreciation', 'send_upload_photos', 'other')
    THEN RAISE EXCEPTION 'Tipo, categoría o prioridad no válidos.'; END IF;
  IF due_date !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'La fecha debe usar el formato AAAA-MM-DD.'; END IF;
  PERFORM due_date::date;
  IF kind <> 'task' THEN
    IF nullif(p_details ->> 'dueDate', '') IS NULL OR nullif(p_details ->> 'scheduledTime', '') IS NULL
      OR (p_details ->> 'scheduledTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      THEN RAISE EXCEPTION 'La actividad necesita fecha y hora válidas.'; END IF;
  END IF;
  IF p_assigned_to IS NOT NULL AND NOT public.can_receive_xapcon_case(p_assigned_to, l.organization_id)
    THEN RAISE EXCEPTION 'El responsable no pertenece a la empresa de este caso.'; END IF;
  SELECT coalesce(nullif(full_name, ''), email) INTO author FROM public.profiles WHERE id = auth.uid();
  SELECT coalesce(nullif(full_name, ''), email) INTO recipient FROM public.profiles WHERE id = p_assigned_to;
  items := coalesce(l.tasks::jsonb, '[]'::jsonb);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(items) t WHERE lower(trim(t ->> 'title')) = lower(trim(p_title))
    AND t ->> 'status' = 'pending' AND t ->> 'dueDate' = due_date) THEN RAISE EXCEPTION 'Esta tarea ya está pendiente para esa fecha.'; END IF;
  task := jsonb_strip_nulls(jsonb_build_object('id', 'task-' || gen_random_uuid()::text, 'title', trim(p_title),
    'status', 'pending', 'dueDate', due_date, 'kind', kind, 'priority', coalesce(p_details ->> 'priority', 'medium'),
    'category', coalesce(p_details ->> 'category', 'general'), 'scheduledTime', CASE WHEN kind <> 'task' THEN p_details ->> 'scheduledTime' END,
    'assignedToId', p_assigned_to, 'assignedTo', recipient, 'createdById', auth.uid(), 'createdBy', author, 'createdAt', now()));
  items := items || jsonb_build_array(task);
  UPDATE public.leads SET tasks = items WHERE id = l.id;
  IF p_assigned_to IS NOT NULL AND p_assigned_to <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, organization_id, created_by, type, title, content, reference_id, reference_type)
    VALUES (p_assigned_to, l.organization_id, auth.uid(), 'task_assigned',
      CASE WHEN kind = 'task' THEN 'Nueva tarea asignada' ELSE 'Nueva actividad agendada' END,
      author || ': ' || trim(p_title) || ' · ' || l.name || ' · ' || due_date || coalesce(' ' || (p_details ->> 'scheduledTime'), ''), l.id, 'lead');
  END IF;
  RETURN items;
END $$;

-- Mantiene el acceso de ejecución limitado a usuarios autenticados.
REVOKE ALL ON FUNCTION public.add_xapcon_task(UUID, TEXT, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xapcon_task(UUID, TEXT, UUID, JSONB) TO authenticated;

COMMIT;
