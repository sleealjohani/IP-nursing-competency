# Supabase project

Project: **IP Nursing Competency**  
Project ref: `cjjqwtujaakzqydfbygh`  
Region: `ap-south-1`

The production database is already provisioned and currently contains the clinical competency content, nurse session workflow, manager review workflow, RLS policies, audit logging, evaluator profile storage, and private buckets for signatures and PDF templates.

Current migration history on the remote project:

- `20260924090341` — `001_schema`
- `20260924090554` — `002_seed_competencies`
- `20260924092714` — `003_tighten_function_grants`
- `20260924093026` — `004_templates_bucket`
- `005_all_competency_forms_schema` — rating options, equipment answers (VT/RD/UEC), nurse header details in `nurse_start` / `nurse_get`, per-form answer validation
- content of `migrations/20260925090000_005_all_competency_forms.sql` — the 43 forms / 780 statements; the previous 225 questions were replaced and the 47 saved answers moved to the new ids (loaded 2026-09-25)
- `006_bulk_approval` — `staff_approve_sessions(uuid[])`: approve every form for one or many submitted nurses
