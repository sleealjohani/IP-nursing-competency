-- Approve (finalize) every active competency form for one or many submitted assessments at once.
-- Each approved session is completed and locked, exactly like "Complete & lock" on a single nurse.
create or replace function public.staff_approve_sessions(p_sessions uuid[])
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_snap jsonb; v_id uuid; n int := 0; skipped int := 0;
begin
  if not public.is_staff() then raise exception 'NOT_AUTHORIZED'; end if;
  v_snap := public._evaluator_snapshot();
  if v_snap is null then return json_build_object('ok',false,'error','NO_EVALUATOR_PROFILE'); end if;
  foreach v_id in array coalesce(p_sessions, '{}') loop
    perform 1 from public.assessment_sessions where id = v_id and status in ('submitted','reopened') for update;
    if not found then skipped := skipped + 1; continue; end if;
    insert into public.manager_reviews (session_id, competency_id, finalized, finalized_at, finalized_by, evaluator_snapshot)
    select v_id, c.id, true, now(), auth.uid(), v_snap from public.competencies c where c.is_active
    on conflict (session_id, competency_id) do update set
      finalized = true,
      finalized_at = case when public.manager_reviews.finalized then public.manager_reviews.finalized_at else now() end,
      finalized_by = case when public.manager_reviews.finalized then public.manager_reviews.finalized_by else auth.uid() end,
      evaluator_snapshot = case when public.manager_reviews.finalized then public.manager_reviews.evaluator_snapshot else v_snap end;
    update public.assessment_sessions set status = 'completed', completed_at = now(), completed_by = auth.uid() where id = v_id;
    insert into public.audit_logs (actor_type, actor_id, action, session_id, details)
    values ('staff', auth.uid(), 'session.approve_all', v_id, null);
    n := n + 1;
  end loop;
  return json_build_object('ok',true,'approved',n,'skipped',skipped);
end $function$;
revoke all on function public.staff_approve_sessions(uuid[]) from public;
grant execute on function public.staff_approve_sessions(uuid[]) to authenticated;
