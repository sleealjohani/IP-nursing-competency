-- Delete a participant's assessment (answers, reviews, generated-document log) from the evaluator portal.
-- The nurse record is removed too when no other assessment remains, so the job number can start again.
create or replace function public.staff_delete_session(p_session uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_s public.assessment_sessions; v_n public.nurses; v_answers int;
begin
  if not public.is_staff() then raise exception 'NOT_AUTHORIZED'; end if;
  select * into v_s from public.assessment_sessions where id = p_session for update;
  if not found then return json_build_object('ok',false,'error','NOT_FOUND'); end if;
  select * into v_n from public.nurses where id = v_s.nurse_id;
  select count(*) into v_answers from public.assessment_answers where session_id = p_session;
  -- answers of a completed (locked) assessment are guarded against changes: unlock first
  update public.assessment_sessions set status = 'reopened' where id = p_session and status = 'completed';
  delete from public.assessment_answers where session_id = p_session;
  delete from public.manager_reviews where session_id = p_session;
  delete from public.generated_documents where session_id = p_session;
  delete from public.assessment_sessions where id = p_session;
  if not exists (select 1 from public.assessment_sessions where nurse_id = v_s.nurse_id) then
    delete from public.nurses where id = v_s.nurse_id;
  end if;
  insert into public.audit_logs (actor_type, actor_id, action, session_id, details)
  values ('staff', auth.uid(), 'session.delete', p_session,
          jsonb_build_object('nurse', v_n.name, 'job_number', v_n.job_number, 'status', v_s.status, 'answers', v_answers));
  return json_build_object('ok',true);
end $function$;
revoke all on function public.staff_delete_session(uuid) from public;
grant execute on function public.staff_delete_session(uuid) to authenticated;
