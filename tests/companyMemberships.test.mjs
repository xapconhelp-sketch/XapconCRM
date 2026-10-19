import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('membership migration backfills current companies and restricts privilege changes to superadmins', async t => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  const owner = '00000000-0000-4000-8000-000000000002';
  const company = '10000000-0000-4000-8000-000000000001';
  const sql = async (query, params = []) => (await db.query(query, params)).rows;
  const actor = async (id, action) => {
    await sql("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('SET ROLE authenticated');
    try { return await action(); }
    finally { await db.exec('RESET ROLE'); await sql("SELECT set_config('request.jwt.claim.sub','',false)"); }
  };

  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE public.profiles(id UUID PRIMARY KEY, role TEXT NOT NULL);
      CREATE TABLE public.organizations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), is_internal BOOLEAN NOT NULL DEFAULT FALSE);
      CREATE FUNCTION public.is_xapcon_superadmin() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='super_admin') $$;
      GRANT USAGE ON SCHEMA public,auth TO authenticated;
      GRANT SELECT,UPDATE ON public.organizations TO authenticated;
      INSERT INTO profiles VALUES ('${admin}','super_admin'),('${owner}','owner');
      INSERT INTO organizations(id) VALUES ('${company}');
    `);
    const migration = await readFile(new URL('../schema_company_memberships.sql', import.meta.url), 'utf8');
    await db.exec(migration);

    await t.test('existing and new companies receive the intended defaults', async () => {
      assert.deepEqual((await sql('SELECT membership_plan,insurance_calls_enabled,homeowner_followup_level FROM organizations WHERE id=$1', [company]))[0], {
        membership_plan: 'pro', insurance_calls_enabled: false, homeowner_followup_level: 'partial',
      });
      const [{ id: newCompany }] = await sql('INSERT INTO organizations DEFAULT VALUES RETURNING id');
      assert.deepEqual((await sql('SELECT membership_plan,insurance_calls_enabled,homeowner_followup_level FROM organizations WHERE id=$1', [newCompany]))[0], {
        membership_plan: 'software_only', insurance_calls_enabled: false, homeowner_followup_level: 'none',
      });
    });

    await t.test('only the superadmin can change company membership privileges', async () => {
      await assert.rejects(actor(owner, () => sql('UPDATE organizations SET membership_plan=$1 WHERE id=$2', ['plus', company])), /Solo un superadministrador/i);
      await actor(admin, () => sql('UPDATE organizations SET membership_plan=$1,insurance_calls_enabled=TRUE,homeowner_followup_level=$2 WHERE id=$3', ['plus', 'full', company]));
      assert.deepEqual((await sql('SELECT membership_plan,insurance_calls_enabled,homeowner_followup_level FROM organizations WHERE id=$1', [company]))[0], { membership_plan: 'plus', insurance_calls_enabled: true, homeowner_followup_level: 'full' });
      await assert.rejects(sql('UPDATE organizations SET membership_plan=$1 WHERE id=$2', ['enterprise', company]), /organizations_membership_plan_valid/);
    });

    await t.test('the migration can be safely reapplied without changing saved privileges', async () => {
      await db.exec(migration);
      assert.deepEqual((await sql('SELECT membership_plan,insurance_calls_enabled,homeowner_followup_level FROM organizations WHERE id=$1', [company]))[0], { membership_plan: 'plus', insurance_calls_enabled: true, homeowner_followup_level: 'full' });
    });
  } finally {
    await db.close();
  }
});

test('membership migration converts an already-applied boolean homeowner setting', async () => {
  const db = new PGlite();
  const sql = async (query, params = []) => (await db.query(query, params)).rows;
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT null::uuid $$;
      CREATE TABLE public.profiles(id UUID PRIMARY KEY, role TEXT NOT NULL);
      CREATE TABLE public.organizations(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), is_internal BOOLEAN NOT NULL DEFAULT FALSE,
        membership_plan TEXT NOT NULL DEFAULT 'software_only', insurance_calls_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        homeowner_followup_enabled BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE FUNCTION public.is_xapcon_superadmin() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT FALSE $$;
      INSERT INTO organizations(id,membership_plan,homeowner_followup_enabled) VALUES
        ('10000000-0000-4000-8000-000000000001','pro',TRUE),
        ('10000000-0000-4000-8000-000000000002','plus',TRUE),
        ('10000000-0000-4000-8000-000000000003','software_only',FALSE),
        ('10000000-0000-4000-8000-000000000004','pro',FALSE);
    `);
    await db.exec(await readFile(new URL('../schema_company_memberships.sql', import.meta.url), 'utf8'));
    assert.deepEqual(await sql('SELECT membership_plan,homeowner_followup_level FROM organizations ORDER BY id'), [
      { membership_plan: 'pro', homeowner_followup_level: 'partial' },
      { membership_plan: 'plus', homeowner_followup_level: 'full' },
      { membership_plan: 'software_only', homeowner_followup_level: 'none' },
      { membership_plan: 'pro', homeowner_followup_level: 'none' },
    ]);
    assert.equal((await sql("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='homeowner_followup_enabled'"))[0].count, 0);
  } finally {
    await db.close();
  }
});
