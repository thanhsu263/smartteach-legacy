-- ORDER BY belongs inside jsonb_agg, otherwise PostgreSQL rejects the query
-- because created_at is neither grouped nor aggregated. UUID breaks timestamp
-- ties so key selection stays deterministic across repeated runtime reads.
create or replace function public.ai_runtime() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not_authorized' using errcode='42501';
  end if;
  return jsonb_build_object(
    'settings',(
      select to_jsonb(s)-'id'
      from private.ai_settings s
      where s.id
    ),
    'credentials',(
      select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at,c.id),'[]'::jsonb)
      from private.ai_credentials c
      where c.enabled and c.state<>'invalid'
    )
  );
end;
$$;

revoke all on function public.ai_runtime() from public,anon,authenticated;
grant execute on function public.ai_runtime() to service_role;
