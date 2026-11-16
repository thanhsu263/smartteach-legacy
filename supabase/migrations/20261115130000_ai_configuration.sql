create table private.ai_settings(
 id boolean primary key default true check(id),chat_model text,
 output_tokens integer not null default 1500 check(output_tokens between 100 and 1500),
 user_daily_cap integer not null default 20 check(user_daily_cap between 1 and 100),
 rpm integer not null default 5 check(rpm between 1 and 100),
 tpm integer not null default 30000 check(tpm between 2000 and 1000000),
 rpd integer not null default 100 check(rpd between 1 and 10000),version integer not null default 1,
 check(chat_model is null or chat_model='gemini-2.5-flash-lite')
);
insert into private.ai_settings(id) values(true);
create table private.ai_credentials(
 id uuid primary key,label text not null check(length(btrim(label)) between 1 and 80),
 project_ref text not null check(project_ref ~ '^[a-z0-9][a-z0-9-]{2,99}$'),
 ciphertext jsonb not null,last4 text not null check(length(last4)=4),
 enabled boolean not null default true,state text not null default 'untested' check(state in ('untested','healthy','invalid','permission','transient')),
 free_verified_at timestamptz not null,version integer not null default 1,last_test_at timestamptz,error_code text,
 created_at timestamptz not null default now()
);
create table private.ai_quota(
 project_ref text not null,model text not null,minute_at timestamptz not null,date_at date not null,
 minute_requests integer not null default 0,minute_tokens integer not null default 0,day_requests integer not null default 0,
 cooldown_until timestamptz,primary key(project_ref,model)
);
revoke all on private.ai_settings,private.ai_credentials,private.ai_quota from public,anon,authenticated;
create function public.admin_ai_config() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_admin();
 return jsonb_build_object('settings',(select jsonb_build_object('model',chat_model,'outputTokens',output_tokens,'userDailyCap',user_daily_cap,'rpm',rpm,'tpm',tpm,'rpd',rpd,'version',version) from private.ai_settings where id),
 'credentials',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'projectRef',project_ref,'last4',last4,'enabled',enabled,'state',state,'version',version,'freeVerifiedAt',free_verified_at,'lastTestAt',last_test_at,'errorCode',error_code) order by created_at),'[]') from private.ai_credentials));
end;
$$;
create function public.admin_save_ai_settings(p_data jsonb,p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_data is null or jsonb_typeof(p_data)<>'object' or p_expected_version is null
 or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('model','outputTokens','userDailyCap','rpm','tpm','rpd'))
 or coalesce(p_data->>'model','') not in ('','gemini-2.5-flash-lite')
 or not(p_data ?& array['outputTokens','userDailyCap','rpm','tpm','rpd']) then raise exception 'invalid_ai_settings' using errcode='PT400';end if;
 update private.ai_settings set chat_model=nullif(p_data->>'model',''),output_tokens=(p_data->>'outputTokens')::integer,
 user_daily_cap=(p_data->>'userDailyCap')::integer,rpm=(p_data->>'rpm')::integer,tpm=(p_data->>'tpm')::integer,rpd=(p_data->>'rpd')::integer,version=version+1
 where id and version=p_expected_version;
 if not found then raise exception 'version_conflict' using errcode='PT409';end if;
 insert into private.admin_audit(actor_id,target_id,action) values(auth.uid(),'ai','ai.settings');
end;
$$;
create function public.admin_save_ai_credential(p_id uuid,p_label text,p_project text,p_ciphertext jsonb,p_last4 text,p_free_verified boolean,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare v_version integer;
begin
 perform private.require_admin();
 if p_id is null or p_free_verified is distinct from true or p_label is null or p_project is null or p_last4 is null or p_expected_version is null
 or p_ciphertext is null or length(p_ciphertext::text)>2000 or jsonb_typeof(p_ciphertext)<>'object'
 or not (p_ciphertext ?& array['v','iv','tag','data']) then raise exception 'credential_invalid' using errcode='PT400';end if;
 perform pg_advisory_xact_lock(hashtextextended('credential:'||p_id::text,0));
 select version into v_version from private.ai_credentials where id=p_id;
 if coalesce(v_version,0)<>p_expected_version then raise exception 'version_conflict' using errcode='PT409';end if;
 insert into private.ai_credentials(id,label,project_ref,ciphertext,last4,free_verified_at) values(p_id,p_label,p_project,p_ciphertext,p_last4,now())
 on conflict(id) do update set label=excluded.label,project_ref=excluded.project_ref,ciphertext=excluded.ciphertext,last4=excluded.last4,enabled=true,state='untested',free_verified_at=now(),version=private.ai_credentials.version+1;
 insert into private.admin_audit(actor_id,target_id,action) values(auth.uid(),p_id::text,'ai.credential.save');
end;
$$;
create function public.admin_control_ai_credential(p_id uuid,p_operation text,p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_admin();
 if p_operation is null or p_operation not in ('enable','disable','delete') then raise exception 'invalid_action' using errcode='PT400';end if;
 perform pg_advisory_xact_lock(hashtextextended('credential:'||p_id::text,0));
 if not exists(select 1 from private.ai_credentials where id=p_id and version=p_expected_version) then raise exception 'version_conflict' using errcode='PT409';end if;
 if p_operation='delete' then delete from private.ai_credentials where id=p_id;
 else update private.ai_credentials set enabled=(p_operation='enable'),version=version+1 where id=p_id;end if;
 insert into private.admin_audit(actor_id,target_id,action) values(auth.uid(),p_id::text,'ai.credential.'||p_operation);
end;
$$;
create function public.ai_runtime() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501';end if;
 return jsonb_build_object('settings',(select to_jsonb(s)-'id' from private.ai_settings s where id),
 'credentials',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from private.ai_credentials c where enabled and state<>'invalid' order by created_at));
end;
$$;
create function public.ai_reserve_quota(p_credential uuid,p_model text,p_tokens integer) returns boolean language plpgsql security definer set search_path='' as $$
declare c private.ai_credentials;q private.ai_quota;s private.ai_settings;now_min timestamptz:=date_trunc('minute',now());today date:=(now() at time zone 'America/Los_Angeles')::date;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501';end if;
 if p_tokens is null or p_tokens<1 or p_tokens>50000 or p_model is null or p_model not in ('gemini-2.5-flash-lite','gemini-embedding-001') then raise exception 'invalid_quota' using errcode='PT400';end if;
 select * into c from private.ai_credentials where id=p_credential and enabled and state<>'invalid';
 if not found then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended('ai:'||c.project_ref||':'||p_model,0));
 select * into s from private.ai_settings where id;
 insert into private.ai_quota(project_ref,model,minute_at,date_at) values(c.project_ref,p_model,now_min,today) on conflict do nothing;
 select * into q from private.ai_quota where project_ref=c.project_ref and model=p_model for update;
 if q.cooldown_until>now() then return false;end if;
 if q.minute_at<>now_min then q.minute_requests:=0;q.minute_tokens:=0;end if;
 if q.date_at<>today then q.day_requests:=0;end if;
 if q.minute_requests>=s.rpm or q.minute_tokens+p_tokens>s.tpm or q.day_requests>=s.rpd then return false;end if;
 update private.ai_quota set minute_at=now_min,date_at=today,minute_requests=q.minute_requests+1,minute_tokens=q.minute_tokens+p_tokens,
 day_requests=q.day_requests+1 where project_ref=c.project_ref and model=p_model;
 return true;
end;
$$;
create function public.ai_record_result(p_credential uuid,p_model text,p_result text,p_cooldown_seconds integer default 0) returns void language plpgsql security definer set search_path='' as $$
declare project text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'not_authorized' using errcode='42501';end if;
 if p_result not in ('healthy','invalid','permission','transient','quota') or p_cooldown_seconds not between 0 and 172800 then raise exception 'invalid_result' using errcode='PT400';end if;
 update private.ai_credentials set state=case when p_result='quota' then state else p_result end,
 last_test_at=now(),error_code=case when p_result='healthy' then null else p_result end where id=p_credential returning project_ref into project;
 if p_result='quota' then update private.ai_quota set cooldown_until=greatest(coalesce(cooldown_until,now()),now()+make_interval(secs=>p_cooldown_seconds)) where project_ref=project and model=p_model;end if;
end;
$$;
revoke all on function public.admin_ai_config(),public.admin_save_ai_settings(jsonb,integer),public.admin_save_ai_credential(uuid,text,text,jsonb,text,boolean,integer),public.admin_control_ai_credential(uuid,text,integer) from public,anon;
grant execute on function public.admin_ai_config(),public.admin_save_ai_settings(jsonb,integer),public.admin_save_ai_credential(uuid,text,text,jsonb,text,boolean,integer),public.admin_control_ai_credential(uuid,text,integer) to authenticated;
revoke all on function public.ai_runtime(),public.ai_reserve_quota(uuid,text,integer),public.ai_record_result(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.ai_runtime(),public.ai_reserve_quota(uuid,text,integer),public.ai_record_result(uuid,text,text,integer) to service_role;
