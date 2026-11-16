-- Google rejects gemini-2.5-flash-lite for new users. Allow the current
-- Free Tier model while retaining the legacy ID for existing configurations.
-- No credential, configured model, quota counter or embedding model is changed.
alter table private.ai_settings drop constraint ai_settings_chat_model_check;
alter table private.ai_settings add constraint ai_settings_chat_model_check
  check(chat_model is null or chat_model in ('gemini-2.5-flash-lite','gemini-3.5-flash-lite'));

create or replace function public.admin_save_ai_settings(p_data jsonb,p_expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin();
  if p_data is null or jsonb_typeof(p_data)<>'object' or p_expected_version is null
    or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('model','outputTokens','userDailyCap','rpm','tpm','rpd'))
    or coalesce(p_data->>'model','') not in ('','gemini-2.5-flash-lite','gemini-3.5-flash-lite')
    or not(p_data ?& array['outputTokens','userDailyCap','rpm','tpm','rpd']) then
    raise exception 'invalid_ai_settings' using errcode='PT400';
  end if;
  update private.ai_settings set chat_model=nullif(p_data->>'model',''),output_tokens=(p_data->>'outputTokens')::integer,
    user_daily_cap=(p_data->>'userDailyCap')::integer,rpm=(p_data->>'rpm')::integer,
    tpm=(p_data->>'tpm')::integer,rpd=(p_data->>'rpd')::integer,version=version+1
    where id and version=p_expected_version;
  if not found then raise exception 'version_conflict' using errcode='PT409';end if;
  insert into private.admin_audit(actor_id,target_id,action) values(auth.uid(),'ai','ai.settings');
end;
$$;

create or replace function public.ai_reserve_quota(p_credential uuid,p_model text,p_tokens integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare c private.ai_credentials;q private.ai_quota;s private.ai_settings;
  now_min timestamptz:=date_trunc('minute',now());
  today date:=(now() at time zone 'America/Los_Angeles')::date;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501';end if;
  if p_tokens is null or p_tokens<1 or p_tokens>50000 or p_model is null
    or p_model not in ('gemini-2.5-flash-lite','gemini-3.5-flash-lite','gemini-embedding-001') then
    raise exception 'invalid_quota' using errcode='PT400';
  end if;
  select * into c from private.ai_credentials where id=p_credential and enabled and state<>'invalid';
  if not found then return false;end if;
  perform pg_advisory_xact_lock(hashtextextended('ai:'||c.project_ref||':'||p_model,0));
  select * into s from private.ai_settings where id;
  insert into private.ai_quota(project_ref,model,minute_at,date_at)
    values(c.project_ref,p_model,now_min,today) on conflict do nothing;
  select * into q from private.ai_quota where project_ref=c.project_ref and model=p_model for update;
  if q.cooldown_until>now() then return false;end if;
  if q.minute_at<>now_min then q.minute_requests:=0;q.minute_tokens:=0;end if;
  if q.date_at<>today then q.day_requests:=0;end if;
  if q.minute_requests>=s.rpm or q.minute_tokens+p_tokens>s.tpm or q.day_requests>=s.rpd then return false;end if;
  update private.ai_quota set minute_at=now_min,date_at=today,
    minute_requests=q.minute_requests+1,minute_tokens=q.minute_tokens+p_tokens,
    day_requests=q.day_requests+1 where project_ref=c.project_ref and model=p_model;
  return true;
end;
$$;

revoke all on function public.admin_save_ai_settings(jsonb,integer) from public,anon;
grant execute on function public.admin_save_ai_settings(jsonb,integer) to authenticated;
revoke all on function public.ai_reserve_quota(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.ai_reserve_quota(uuid,text,integer) to service_role;
