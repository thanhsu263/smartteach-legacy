create function private.purge_expired_chat() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.chat_messages where expires_at<=now();
 delete from private.chat_requests where expires_at<=now();
 delete from public.chat_threads t where (t.deleted_at is not null or t.created_at<now()-interval '30 days')
 and not exists(select 1 from public.chat_messages m where m.thread_id=t.id)
 and not exists(select 1 from private.chat_requests r where r.thread_id=t.id and r.status='processing' and r.created_at>now()-interval '1 minute');
end;
$$;
revoke all on function private.purge_expired_chat() from public,anon,authenticated;
select cron.schedule('smartteach-chat-retention','0 * * * *','select private.purge_expired_chat();');
