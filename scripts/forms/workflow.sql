-- Nurse start now records the form header details (unit, job title, contract date).
drop function if exists public.nurse_start(text, text);
create or replace function public.nurse_start(p_name text, p_job_number text, p_unit text default null,
                                              p_job_title text default null, p_contract_date date default null)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_nurse public.nurses; v_s public.assessment_sessions;
begin
  p_name := regexp_replace(btrim(coalesce(p_name,'')), '\s+', ' ', 'g');
  p_job_number := btrim(coalesce(p_job_number,''));
  p_unit := nullif(left(regexp_replace(btrim(coalesce(p_unit,'')), '\s+', ' ', 'g'), 80), '');
  p_job_title := nullif(left(regexp_replace(btrim(coalesce(p_job_title,'')), '\s+', ' ', 'g'), 80), '');
  if length(p_name) < 2 or length(p_name) > 120 then return json_build_object('ok',false,'error','INVALID_NAME'); end if;
  if p_job_number !~ '^[A-Za-z0-9-]{1,30}$' then return json_build_object('ok',false,'error','INVALID_JOB_NUMBER'); end if;
  select * into v_nurse from public.nurses where job_number = p_job_number;
  if found then
    select * into v_s from public.assessment_sessions where nurse_id = v_nurse.id and status <> 'completed' limit 1;
    if found then
      return json_build_object('ok',false,'error', case when v_s.status = 'submitted' then 'ALREADY_SUBMITTED' else 'SESSION_EXISTS' end);
    end if;
    update public.nurses set name = p_name,
      unit = coalesce(p_unit, unit), job_title = coalesce(p_job_title, job_title), contract_date = coalesce(p_contract_date, contract_date)
    where id = v_nurse.id returning * into v_nurse;
  else
    insert into public.nurses (name, job_number, unit, job_title, contract_date)
    values (p_name, p_job_number, p_unit, p_job_title, p_contract_date) returning * into v_nurse;
  end if;
  insert into public.assessment_sessions (nurse_id, resume_code) values (v_nurse.id, public._resume_code()) returning * into v_s;
  insert into public.audit_logs (actor_type, actor_id, actor_label, action, session_id)
  values ('nurse', v_nurse.id, v_nurse.name || ' / ' || v_nurse.job_number, 'session.start', v_s.id);
  return json_build_object('ok',true,'token',v_s.access_token,'resume_code',v_s.resume_code);
end $function$;
revoke all on function public.nurse_start(text, text, text, text, date) from public;
grant execute on function public.nurse_start(text, text, text, text, date) to anon, authenticated;

create or replace function public.nurse_get(p_token uuid)
 returns json
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select json_build_object('ok', true, 'status', s.status, 'resume_code', s.resume_code,
    'started_at', s.started_at, 'submitted_at', s.submitted_at,
    'nurse', json_build_object('name', n.name, 'job_number', n.job_number, 'unit', n.unit,
                               'job_title', n.job_title, 'contract_date', n.contract_date),
    'answers', coalesce((select json_object_agg(a.question_id, a.answer) from public.assessment_answers a where a.session_id = s.id), '{}'::json))
  from public.assessment_sessions s join public.nurses n on n.id = s.nurse_id
  where s.access_token = p_token
$function$;

-- Answers are validated against the options printed on each form (M/NM/NA or VT/RD/UEC).
create or replace function public.nurse_save_answers(p_token uuid, p_answers jsonb)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_s public.assessment_sessions; k text; v text; v_comp text; v_opts text[]; n int := 0;
begin
  select * into v_s from public.assessment_sessions where access_token = p_token;
  if not found then return json_build_object('ok',false,'error','NOT_FOUND'); end if;
  if v_s.status not in ('in_progress','reopened') then return json_build_object('ok',false,'error','LOCKED'); end if;
  for k, v in select * from jsonb_each_text(p_answers) loop
    select q.competency_id, c.rating_options into v_comp, v_opts
      from public.competency_questions q join public.competencies c on c.id = q.competency_id
     where q.id = k and c.is_active;
    if v_comp is null or not (v = any(v_opts)) then continue; end if;
    insert into public.assessment_answers (session_id, competency_id, question_id, answer)
    values (v_s.id, v_comp, k, v)
    on conflict (session_id, question_id) do update set answer = excluded.answer, answered_at = now(), updated_by = null
    where public.assessment_answers.answer is distinct from excluded.answer;
    n := n + 1;
  end loop;
  update public.assessment_sessions set updated_at = now() where id = v_s.id;
  return json_build_object('ok',true,'saved',n);
end $function$;
