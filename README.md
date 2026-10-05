<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/42e26a9f-7bf4-4678-b527-5d7e712f53aa

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase database setup

After the base CRM tables (`profiles`, `organizations`, `user_organizations`, and `leads`) exist, run these scripts in the Supabase SQL Editor:

1. `schema_company_details.sql`
2. `schema_security_hardening.sql`
3. `schema_insurance_directory.sql`
4. `schema_notifications.sql`
5. `schema_auth_membership_tasks.sql` (apply last; updates account provisioning, company membership, tasks, notifications, and limited Xapcon staff access)

The hardening script replaces existing policies on the CRM tenant tables and sets the signup/invitation role rules. Configure the app's site URL and allowed redirect URLs in Supabase Auth so team email links can return to this app.

For an existing installation that already applied steps 1–4, run only step 5. If earlier scripts are re-run later, re-run step 5 last. The new client requires its RPCs; until this upgrade is applied, login displays an actionable database update message.

See [the activation and verification guide](docs/auth-membership-activation.md). `npm test` runs the finance tests plus the actual SQL migrations, triggers, RPCs and RLS tests in local PostgreSQL through PGlite. It does not create accounts or send emails in the connected Supabase project.
