import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('contractor financial module migration creates scoped tables and accepts app statuses', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      CREATE TABLE public.profiles(id UUID PRIMARY KEY, role TEXT NOT NULL);
      CREATE TABLE public.organizations(id UUID PRIMARY KEY);
      CREATE TABLE public.user_organizations(user_id UUID, organization_id UUID);
      CREATE TABLE public.leads(id UUID PRIMARY KEY, organization_id UUID REFERENCES public.organizations(id));
      CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
      CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
      CREATE FUNCTION storage.foldername(TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1, '/') $$;
      GRANT USAGE ON SCHEMA auth, public, storage TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, storage TO authenticated;
      INSERT INTO organizations(id) VALUES ('10000000-0000-4000-8000-000000000001');
      INSERT INTO leads(id, organization_id) VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');
    `);
    for (const file of ['schema_contractor_claim_finances.sql', 'schema_contractor_payment_receipts.sql', 'schema_contractor_financial_module.sql']) {
      await db.exec(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'));
    }
    await db.exec(await readFile(new URL('../schema_contractor_financial_module.sql', import.meta.url), 'utf8'));

    const columns = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contractor_claim_financials'
    `);
    assert.ok(columns.rows.some(row => row.column_name === 'depreciation_release_date'));
    assert.ok(columns.rows.some(row => row.column_name === 'total_squares'));

    await db.exec(`
      INSERT INTO contractor_claim_payments(claim_id, organization_id, payment_type, payer_type, status, amount, received_date)
      VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'supplement', 'insurance', 'deposited', 350, '2026-09-15');
      INSERT INTO contractor_claim_supplements(claim_id, organization_id, requested_amount, approved_amount, fee_amount)
      VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 500, 350, 45);
      INSERT INTO contractor_claim_costs(claim_id, organization_id, category, amount, is_return_credit)
      VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Devolución', 45, TRUE);
    `);
    const payments = await db.query('SELECT status FROM contractor_claim_payments');
    assert.equal(payments.rows[0].status, 'deposited');
    const costs = await db.query('SELECT is_return_credit FROM contractor_claim_costs');
    assert.equal(costs.rows[0].is_return_credit, true);
  } finally {
    await db.close();
  }
});
