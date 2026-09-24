# IP Nursing Competency

Clinical competency assessment system for inpatient nursing.

**Powered by HALRWEOLI**

## What is included

- Nurse start/resume workflow using name + job number
- 10 mandatory inpatient nursing competencies currently seeded in Supabase
- 225 competency statements organized by Knowledge / Skills / Attitude
- M / NM / NA single-tap assessment
- Autosave through secured Supabase RPC functions
- Resume code for interrupted assessments
- Review and final submission
- Manager authentication with Supabase Auth
- Manager dashboard, filters, nurse/session details and scoring
- Evaluator profile stored once and reused
- Optional evaluator signature upload to the private Supabase Storage bucket
- Per-competency review/remedial details
- Reopen / complete workflow
- Printable official-style competency forms with handwritten-like filled values/checkmarks
- Arabic-first RTL clinical UI with English medical source content preserved
- Premium glass clinical design, subtle motion, floating medical icons

## Supabase

Production project ref: `cjjqwtujaakzqydfbygh`.

The repository contains a safe public fallback Supabase URL and publishable key so a Vercel deployment works immediately. You may override them with:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Never expose a service-role/secret key in the frontend.

## First manager/admin account

Manager pages use Supabase email/password Auth. New signups receive a `pending` profile by design. After creating the intended staff account, promote it in Supabase to either `manager` or `admin`.

Example (replace the email with the real account):

```sql
update public.profiles
set role = 'admin'
where email = 'manager@example.com';
```

Do not create or commit shared admin passwords.

## Local development

```bash
npm install
npm run dev
```

## Quality check

```bash
npm run typecheck
npm run build
```

## Vercel

Import this GitHub repository as a new Vercel project. Framework preset: **Vite**. No server runtime is required; all persistent data and authorization are handled by Supabase.

## Important content note

The English competency statements stored in Supabase are the clinical source content. The application does not rewrite or medically “correct” those statements. Any source item marked `needs_source_review` should be reviewed against the original competency form before formal adoption.
