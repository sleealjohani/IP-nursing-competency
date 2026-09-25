# IP Nursing Competency

Clinical competency assessment system for inpatient nursing.

**Powered by HALRWEOLI**

## What is included

- 43 competency forms as clean, vector, print-ready PDF templates (`public/forms`):
  10 mandatory, 17 general and 16 Long stay specific competencies (780 statements)
- Nurse flow: enter name, job number, unit, job title and contract date once, then answer every
  statement with one of three options (M / NM / NA, or VT / RD / UEC on the equipment checklist) as
  one continuous questionnaire that moves from form to form automatically
- Autosave through secured Supabase RPC functions, resume code for interrupted assessments
- Review and final submission; every form is then listed under the nurse's name for the administration
- Evaluator portal: per-form review, comments, remedial decision and approval; "Approve all" for every
  submitted nurse (or all forms of one nurse); reopen
- Delete a participant (all their forms, answers and approvals) from the dashboard or their panel, with confirmation
- One-click ZIP of approved forms: one PDF per nurse, named after the nurse, with every form approved for them
- PDF output: each original form filled as if hand-written (blue-ink handwriting, hand-drawn ticks,
  raw score and % rating, remedial decision, comments, evaluator name and signature), downloadable per
  form or as one file with all forms
- Arabic-first RTL UI on the Health Holding identity (IP Nursing Competency design system): navy/sky palette,
  Health Holding lockup and star, "Flow of care" pattern, the manual's two-colour icons floating gently,
  competency orbit progress, "Powered by HALRWEOLI" footer
- Arabic translation of every statement and form title on the website (`scripts/forms/translations_ar.json`),
  with the original English one tap away; the PDFs always print the original English
- Font: Janna LT when installed on the device (it is a licensed Linotype face, so it is not shipped in this
  public repository), otherwise IBM Plex Sans Arabic

## Competency forms

The PDF templates in `public/forms` are the source of truth for the questionnaire:

- The 27 digital forms are used exactly as provided.
- The 16 scanned Long stay *SPECIFIC COMPETENCY* forms were re-drawn as vector PDFs by
  `scripts/forms/gen_specific.py` from the verbatim transcription in `scripts/forms/specific.py`
  (original wording, spelling and numbering kept).
- `scripts/forms/build_catalog.py` reads the templates and writes `src/data/catalog.json` (the
  questionnaire) and the Supabase content migration, so the web questions always match the printed form.

```bash
pip install pymupdf reportlab
python3 scripts/forms/gen_specific.py public/forms   # only when the specific forms change
python3 scripts/forms/build_catalog.py
```

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

The English competency statements are the clinical source content, copied exactly as printed on the forms. The application does not rewrite or medically “correct” them.
