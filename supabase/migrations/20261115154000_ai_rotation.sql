create function public.ai_rotation_batch(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_service();
 if p_offset is null or p_offset not between 0 and 100000 then raise exception 'invalid_page' using errcode='PT400';end if;
 return(select coalesce(jsonb_agg(r),'[]') from(select id,project_ref,ciphertext,version from private.ai_credentials order by id limit 20 offset p_offset)r);
end;
$$;
create function public.ai_rotate_credential(p_id uuid,p_ciphertext jsonb,p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_service();
 if p_ciphertext is null or jsonb_typeof(p_ciphertext)<>'object' or not p_ciphertext ?& array['v','iv','tag','data'] then raise exception 'credential_invalid' using errcode='PT400';end if;
 update private.ai_credentials set ciphertext=p_ciphertext,version=version+1 where id=p_id and version=p_expected_version;
 if not found then raise exception 'version_conflict' using errcode='PT409';end if;
 insert into private.admin_audit(target_id,action) values(p_id::text,'ai.master_rotate');
end;
$$;
revoke all on function public.ai_rotation_batch(integer),public.ai_rotate_credential(uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.ai_rotation_batch(integer),public.ai_rotate_credential(uuid,jsonb,integer) to service_role;
