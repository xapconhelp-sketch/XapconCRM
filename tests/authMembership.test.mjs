import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { eligibleCaseMembers, isTaskAssignedTo, memberBelongsToOrganization } from '../src/lib/teamAccess.js';

test('member selectors use every organization ID and never company names', () => {
  const members = [
    { id: 'a', company: 'Same name', roleCategory: 'pm', organizationIds: ['org-a', 'org-b'] },
    { id: 'b', company: 'Same name', roleCategory: 'pm', organizationIds: ['org-c'] },
    { id: 'root', roleCategory: 'admin', organizationIds: ['internal'] },
    { id: 'staff', roleCategory: 'staff', organizationIds: ['internal'] }
  ];
  assert.deepEqual(eligibleCaseMembers(members, 'org-b').map(m => m.id), ['a', 'root']);
  assert.equal(memberBelongsToOrganization(members[1], 'org-b'), false);
  assert.equal(isTaskAssignedTo({ assignedToId: 'a', assignedTo: 'Same name' }, 'b'), false);
});

// Runs the actual migrations, functions, triggers and RLS in PostgreSQL (WASM).
// Supabase's external email delivery and auth HTTP service are tested separately.
test('PostgreSQL account, company, task and notification integration', async t => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  const saul = '00000000-0000-4000-8000-000000000002';
  const jonathan = '00000000-0000-4000-8000-000000000003';
  const coworker = '00000000-0000-4000-8000-000000000004';
  const outsider = '00000000-0000-4000-8000-000000000005';
  const staff = '00000000-0000-4000-8000-000000000006';
  const claim = '10000000-0000-4000-8000-000000000001';
  let company, code, taskId, internal;
  const sql = async (query, params = []) => (await db.query(query, params)).rows;
  const actor = async (id, action) => {
    const [{ email }] = await sql('SELECT email FROM auth.users WHERE id=$1', [id]);
    await sql("SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)", [id, JSON.stringify({ email, sub: id })]);
    await db.exec('SET ROLE authenticated');
    try { return await action(); }
    finally { await db.exec('RESET ROLE'); await sql("SELECT set_config('request.jwt.claim.sub','',false)"); }
  };
  const signup = (id, email, metadata, confirmed = true) => sql(
    'INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES($1,$2,$3,$4)',
    [id, email, metadata, confirmed ? new Date().toISOString() : null]
  );
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT NOT NULL, raw_user_meta_data JSONB DEFAULT '{}', email_confirmed_at TIMESTAMPTZ);
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      CREATE TABLE public.profiles(id UUID PRIMARY KEY REFERENCES auth.users, email TEXT, full_name TEXT, role TEXT DEFAULT 'employee',
        organization_id UUID, company_email TEXT, company_website TEXT, registration_number TEXT, license_number TEXT);
      CREATE TABLE public.organizations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, company_name TEXT, invite_code TEXT NOT NULL);
      ALTER TABLE public.profiles ADD FOREIGN KEY (organization_id) REFERENCES public.organizations;
      CREATE TABLE public.user_organizations(user_id UUID REFERENCES public.profiles, organization_id UUID REFERENCES public.organizations, PRIMARY KEY(user_id,organization_id));
      CREATE TABLE public.leads(id UUID PRIMARY KEY, name TEXT, organization_id UUID REFERENCES public.organizations,
        tasks JSONB DEFAULT '[]', timeline JSONB DEFAULT '[]');
      GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${admin}','root@test.invalid',now());
      INSERT INTO public.profiles(id,email,full_name,role) VALUES('${admin}','root@test.invalid','Root','super_admin');
    `);
    await db.exec(await readFile(new URL('../schema_auth_membership_complete.sql', import.meta.url), 'utf8'));
    await db.exec(`
      CREATE FUNCTION auth.create_profile() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
        INSERT INTO public.profiles(id,email,full_name) VALUES(NEW.id,NEW.email,NEW.raw_user_meta_data->>'full_name'); RETURN NEW; END $$;
      CREATE TRIGGER new_auth_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.create_profile();
    `);

    await t.test('owner signup atomically creates a unique code and owner membership', async () => {
      await signup(saul, 'saul@test.invalid', { full_name: 'Saúl Martínez', role: 'Dueño', companyName: '479 Roofing' });
      const [p] = await sql('SELECT organization_id FROM profiles WHERE id=$1', [saul]); company = p.organization_id;
      const [o] = await sql('SELECT invite_code FROM organizations WHERE id=$1', [company]); code = o.invite_code;
      assert.match(code, /^XAP-[0-9A-F]{10}$/);
      const [m] = await sql('SELECT membership_role FROM user_organizations WHERE user_id=$1', [saul]);
      assert.equal(m.membership_role, 'owner');
      await actor(saul, () => sql('SELECT bootstrap_xapcon_account()'));
      assert.equal((await sql('SELECT id FROM organizations WHERE created_by=$1', [saul])).length, 1);
      await assert.rejects(sql('INSERT INTO organizations(name,invite_code) VALUES($1,$2)', ['Other', code.toLowerCase()]), /duplicate/i);
    });
    await t.test('an invalid code rejects signup and rolls the auth row back', async () => {
      const invalid = '00000000-0000-4000-8000-000000000099';
      await assert.rejects(signup(invalid, 'invalid@test.invalid', { full_name: 'Invalid', companyCode: 'XAP-INVALID' }), /código/i);
      assert.equal((await sql('SELECT id FROM auth.users WHERE id=$1', [invalid])).length, 0);
    });
    await t.test('employees join the exact company and cannot promote or move themselves', async () => {
      await signup(jonathan, 'jonathan@test.invalid', { full_name: 'Jonathan', companyCode: ` ${code.toLowerCase()} `, role: 'super_admin', jobTitle: 'Project Manager' });
      await signup(coworker, 'coworker@test.invalid', { full_name: 'Jonathan', companyCode: code });
      await signup(outsider, 'other@test.invalid', { full_name: 'Other Owner', role: 'Dueño', companyName: 'Other Company' });
      const [p] = await sql('SELECT role,organization_id FROM profiles WHERE id=$1', [jonathan]);
      assert.equal(p.role, 'employee'); assert.equal(p.organization_id, company);
      await actor(jonathan, async () => {
        assert.equal((await sql('SELECT id FROM profiles WHERE id IN ($1,$2)', [saul, coworker])).length, 2);
        assert.equal((await sql('SELECT id FROM profiles WHERE id=$1', [outsider])).length, 0);
        await assert.rejects(sql("UPDATE profiles SET role='super_admin' WHERE id=$1", [jonathan]), /rol/i);
        await assert.rejects(sql('UPDATE profiles SET organization_id=NULL WHERE id=$1', [jonathan]), /empresa/i);
        await assert.rejects(sql('SELECT save_xapcon_invitation($1,$2,$3,$4)', ['evil@test.invalid', 'Evil', 'employee', company]), /propietario/i);
      });
    });
    await t.test('Xapcon invitation is verified, limited and cannot use the internal public code', async () => {
      [internal] = await sql('SELECT id,invite_code FROM organizations WHERE is_internal');
      await actor(admin, () => sql("SELECT save_xapcon_invitation($1,$2,'platform_staff')", ['staff@test.invalid', 'Xapcon Staff']));
      await signup(staff, 'staff@test.invalid', {}, false);
      assert.equal((await sql('SELECT * FROM user_organizations WHERE user_id=$1', [staff])).length, 0);
      await actor(staff, () => assert.rejects(sql('SELECT bootstrap_xapcon_account()'), /Confirma/i));
      await sql('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [staff]);
      await actor(staff, () => sql('SELECT bootstrap_xapcon_account()'));
      const [p] = await sql('SELECT role,organization_id FROM profiles WHERE id=$1', [staff]);
      assert.equal(p.role, 'platform_staff'); assert.equal(p.organization_id, internal.id);
      await actor(staff, async () => {
        assert.equal((await sql('SELECT id FROM organizations WHERE id=$1', [company])).length, 0);
        await assert.rejects(sql("SELECT save_xapcon_invitation('promote@test.invalid','Promote','super_admin')"), /superadministrador/i);
      });
      assert.equal((await sql('SELECT * FROM validate_company_invite_code($1)', [internal.invite_code])).length, 0);
    });
    await t.test('only an admin can grant/revoke staff access and internal membership is preserved', async () => {
      await actor(saul, () => assert.rejects(sql('SELECT set_xapcon_staff_organizations($1,$2)', [staff, [company]]), /superadministrador/i));
      await actor(admin, () => sql('SELECT set_xapcon_staff_organizations($1,$2)', [staff, [company]]));
      const [notice] = await sql("INSERT INTO notifications(user_id,organization_id,type,title) VALUES($1,$2,'mention','Company access') RETURNING id", [staff, company]);
      await actor(staff, async () => {
        assert.equal((await sql('SELECT id FROM organizations WHERE id=$1', [company])).length, 1);
        assert.equal((await sql('SELECT can_manage_xapcon_org($1) allowed', [company]))[0].allowed, false);
        assert.equal((await sql('SELECT id FROM get_xapcon_unread_notifications($1) WHERE id=$2', [company, notice.id])).length, 1);
      });
      await actor(admin, () => sql('SELECT set_xapcon_staff_organizations($1,$2)', [staff, []]));
      await actor(staff, async () => {
        assert.equal((await sql('SELECT id FROM organizations WHERE id=$1', [company])).length, 0);
        assert.equal((await sql('SELECT id FROM organizations WHERE id=$1', [internal.id])).length, 1);
        assert.equal((await sql('SELECT id FROM notifications WHERE id=$1', [notice.id])).length, 0);
        assert.equal((await sql('SELECT id FROM get_xapcon_unread_notifications($1) WHERE id=$2', [company, notice.id])).length, 0);
      });
    });
    await t.test('owner email invitations claim membership only after email confirmation', async () => {
      const invited = '00000000-0000-4000-8000-000000000007';
      await actor(saul, () => sql('SELECT save_xapcon_invitation($1,$2,$3,$4)', ['invited@test.invalid', 'Invited Employee', 'employee', company]));
      await signup(invited, 'invited@test.invalid', {}, false);
      assert.equal((await sql('SELECT * FROM user_organizations WHERE user_id=$1', [invited])).length, 0);
      await sql('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [invited]);
      await actor(invited, () => sql('SELECT bootstrap_xapcon_account()'));
      assert.equal((await sql('SELECT organization_id FROM profiles WHERE id=$1', [invited]))[0].organization_id, company);
      assert.equal((await sql('SELECT * FROM user_invitations WHERE email=$1', ['invited@test.invalid'])).length, 0);
    });
    await t.test('task assignment and notification are committed together using user IDs', async () => {
      await sql('INSERT INTO leads(id,name,organization_id) VALUES($1,$2,$3)', [claim, 'Test case', company]);
      const [row] = await actor(saul, () => sql("SELECT add_xapcon_task($1,'Call homeowner',$2,$3) tasks", [claim, jonathan, { dueDate: '2026-10-05', kind: 'task' }]));
      taskId = row.tasks[0].id;
      assert.equal(row.tasks[0].assignedToId, jonathan); assert.equal(row.tasks[0].createdById, saul);
      assert.equal((await sql("SELECT id FROM notifications WHERE user_id=$1 AND type='task_assigned'", [jonathan])).length, 1);
      await actor(saul, () => assert.rejects(sql("SELECT add_xapcon_task($1,'Bad assignment',$2)", [claim, outsider]), /responsable/i));
      assert.equal((await sql('SELECT tasks FROM leads WHERE id=$1', [claim]))[0].tasks.length, 1);
      await actor(outsider, () => assert.rejects(sql("SELECT add_xapcon_task($1,'No access')", [claim]), /acceso/i));
    });
    await t.test('direct task writes are denied and a notification failure rolls back the task', async () => {
      await actor(saul, () => assert.rejects(sql("UPDATE leads SET tasks='[]' WHERE id=$1", [claim]), /permission denied/i));
      await actor(saul, () => assert.rejects(sql("INSERT INTO notifications(user_id,organization_id,created_by,type,title) VALUES($1,$2,$3,'mention','Fake author')", [jonathan, company, saul]), /permission denied/i));
      await db.exec(`CREATE FUNCTION fail_test_notification() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test delivery failure'; END $$;
        CREATE TRIGGER fail_notification BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_test_notification();`);
      try {
        await actor(saul, () => assert.rejects(sql("SELECT add_xapcon_task($1,'Atomic rollback',$2)", [claim, jonathan]), /test delivery failure/i));
        assert.equal((await sql('SELECT tasks FROM leads WHERE id=$1', [claim]))[0].tasks.length, 1);
      } finally { await db.exec('DROP TRIGGER fail_notification ON notifications; DROP FUNCTION fail_test_notification()'); }
    });
    await t.test('a private notification is visible only to the recipient, even to coworkers or admins', async () => {
      await actor(jonathan, async () => {
        assert.equal((await sql('SELECT * FROM notifications')).length, 1);
        assert.equal((await sql('SELECT * FROM get_xapcon_unread_notifications($1)', [company])).length, 1);
      });
      for (const user of [coworker, saul, admin, outsider]) await actor(user, async () => {
        assert.equal((await sql('SELECT * FROM notifications')).length, 0);
        assert.equal((await sql('SELECT * FROM get_xapcon_unread_notifications($1)', [company])).length, 0);
      });
    });
    await t.test('completion notifies the creator once and is idempotent', async () => {
      await actor(jonathan, () => sql('SELECT set_xapcon_task_completed($1,$2,true)', [claim, taskId]));
      await actor(jonathan, () => sql('SELECT set_xapcon_task_completed($1,$2,true)', [claim, taskId]));
      assert.equal((await sql("SELECT id FROM notifications WHERE user_id=$1 AND type='task_completed'", [saul])).length, 1);
    });
    await t.test('mentions notify exact IDs; an unauthorized mention rolls back the whole note', async () => {
      await actor(saul, () => sql('SELECT add_xapcon_timeline_event($1,$2)', [claim, { type: 'note', content: '@Jonathan', mentionedUserIds: [jonathan] }]));
      assert.equal((await sql("SELECT id FROM notifications WHERE user_id=$1 AND type='mention'", [jonathan])).length, 1);
      assert.equal((await sql("SELECT id FROM notifications WHERE user_id=$1 AND type='mention'", [coworker])).length, 0);
      await actor(saul, () => assert.rejects(sql('SELECT add_xapcon_timeline_event($1,$2)', [claim, { type: 'note', content: 'invalid', mentionedUserIds: [outsider] }]), /acceso/i));
      assert.equal((await sql('SELECT timeline FROM leads WHERE id=$1', [claim]))[0].timeline.length, 1);
    });
    await t.test('broadcast read receipts are independent for each colleague', async () => {
      const [n] = await sql("INSERT INTO notifications(organization_id,type,title) VALUES($1,'status_changed','Company message') RETURNING id", [company]);
      await actor(jonathan, () => sql('SELECT read_xapcon_notifications($1)', [n.id]));
      await actor(jonathan, async () => assert.equal((await sql('SELECT id FROM get_xapcon_unread_notifications($1) WHERE id=$2', [company, n.id])).length, 0));
      await actor(coworker, async () => assert.equal((await sql('SELECT id FROM get_xapcon_unread_notifications($1) WHERE id=$2', [company, n.id])).length, 1));
    });
    await t.test('retail company defaults allow owners only and enforce valid amounts', async () => {
      const migration = await readFile(new URL('../schema_company_retail_pricing.sql', import.meta.url), 'utf8');
      await db.exec(migration);
      await db.exec(migration);
      await actor(saul, () => sql('UPDATE organizations SET retail_tax_rate=0.1, retail_default_fee=25 WHERE id=$1', [company]));
      const denied = await actor(jonathan, () => sql('UPDATE organizations SET retail_default_fee=999 WHERE id=$1 RETURNING id', [company]));
      assert.equal(denied.length, 0);
      const [row] = await sql('SELECT retail_tax_rate, retail_default_fee FROM organizations WHERE id=$1', [company]);
      assert.equal(Number(row.retail_tax_rate), 0.1);
      assert.equal(Number(row.retail_default_fee), 25);
      await actor(saul, () => assert.rejects(sql('UPDATE organizations SET retail_tax_rate=1.1 WHERE id=$1', [company]), /check/i));
      await actor(saul, () => assert.rejects(sql('UPDATE organizations SET retail_default_fee=-1 WHERE id=$1', [company]), /check/i));
    });
    await t.test('the upgrade can be safely applied a second time', async () => {
      await db.exec(await readFile(new URL('../schema_auth_membership_complete.sql', import.meta.url), 'utf8'));
      assert.equal((await sql('SELECT id FROM organizations WHERE is_internal')).length, 1);
      assert.equal((await sql('SELECT * FROM user_organizations WHERE user_id=$1 AND organization_id=$2', [saul, company])).length, 1);
    });
  } finally { await db.close(); }
});
