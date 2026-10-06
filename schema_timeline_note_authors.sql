-- Ensure notes always retain the authenticated user's display name.
-- Run this migration once in the Supabase SQL editor for the project database.
CREATE OR REPLACE FUNCTION public.add_xapcon_timeline_event(p_lead_id UUID, p_event JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE l public.leads%ROWTYPE; event JSONB; items JSONB; author TEXT; author_role TEXT; recipient UUID;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_xapcon_org(l.organization_id) THEN RAISE EXCEPTION 'No tienes acceso a este caso.'; END IF;
  IF coalesce(p_event ->> 'type', '') NOT IN ('status_change', 'photo_upload', 'call_log', 'note', 'system')
    OR jsonb_typeof(coalesce(p_event -> 'mentionedUserIds', '[]'::jsonb)) <> 'array'
    THEN RAISE EXCEPTION 'Evento no válido.'; END IF;
  SELECT coalesce(nullif(btrim(full_name), ''), nullif(btrim(email), '')),
    CASE lower(btrim(role))
      WHEN 'super_admin' THEN 'Superadmin'
      WHEN 'admin' THEN 'Superadmin'
      WHEN 'platform_staff' THEN 'Equipo Xapcon'
      WHEN 'owner' THEN 'Propietario'
      WHEN 'dueño' THEN 'Propietario'
      WHEN 'employee' THEN 'Empleado'
      WHEN 'colaborador' THEN 'Empleado'
      WHEN 'contractor' THEN 'Contratista'
      WHEN 'contratista' THEN 'Contratista'
      WHEN 'vendedor' THEN 'Vendedor'
      WHEN 'gerente de ventas' THEN 'Gerente de ventas'
      ELSE initcap(role)
    END
    INTO author, author_role
    FROM public.profiles WHERE id = auth.uid();
  author := coalesce(
    nullif(btrim(author), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(btrim(split_part(auth.jwt() ->> 'email', '@', 1)), ''),
    'Usuario del equipo'
  );
  author_role := coalesce(author_role, CASE lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', ''))
    WHEN 'super_admin' THEN 'Superadmin' WHEN 'admin' THEN 'Superadmin'
    WHEN 'platform_staff' THEN 'Equipo Xapcon' WHEN 'owner' THEN 'Propietario' WHEN 'dueño' THEN 'Propietario'
    WHEN 'employee' THEN 'Empleado' WHEN 'colaborador' THEN 'Empleado'
    WHEN 'contractor' THEN 'Contratista' WHEN 'contratista' THEN 'Contratista'
    WHEN 'vendedor' THEN 'Vendedor' WHEN 'gerente de ventas' THEN 'Gerente de ventas'
    ELSE 'Usuario del equipo' END);
  author := author || ' (' || author_role || ')';
  event := p_event || jsonb_build_object(
    'id', 'timeline-' || gen_random_uuid()::text,
    'author', author,
    'authorId', auth.uid(),
    'date', now(),
    'timestamp', now()
  );
  items := jsonb_build_array(event) || coalesce(l.timeline::jsonb, '[]'::jsonb);
  UPDATE public.leads SET timeline = items WHERE id = l.id;
  IF event ->> 'type' = 'note' THEN
    FOR recipient IN SELECT DISTINCT value::uuid FROM jsonb_array_elements_text(coalesce(event -> 'mentionedUserIds', '[]'::jsonb))
    LOOP
      IF NOT public.can_receive_xapcon_case(recipient, l.organization_id) THEN RAISE EXCEPTION 'La persona mencionada no tiene acceso a este caso.'; END IF;
      IF recipient <> auth.uid() THEN
        INSERT INTO public.notifications (user_id, organization_id, created_by, type, title, content, reference_id, reference_type)
        VALUES (recipient, l.organization_id, auth.uid(), 'mention', author || ' te mencionó en ' || l.name, event ->> 'content', l.id, 'lead');
      END IF;
    END LOOP;
  END IF;
  RETURN items;
END $$;

