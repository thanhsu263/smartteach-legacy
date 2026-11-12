-- Phase 10: dọn bài đã đóng theo lịch hằng ngày. Đường dọn cơ hội trong
-- create_assignment vẫn giữ nguyên để dữ liệu không phụ thuộc vào pg_cron.
-- Khối này cố ý không làm migration lỗi trên self-host/local thiếu pg_cron.

do $cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      if not exists (select 1 from cron.job where jobname = 'smartteach-purge-old-assignments') then
        perform cron.schedule(
          'smartteach-purge-old-assignments',
          '23 3 * * *',
          'select private.purge_old_assignments(365, null, 500)'
        );
      end if;
    exception when others then
      raise notice 'Không lập lịch được pg_cron (%); bài cũ vẫn được xoá cơ hội khi tạo bài.', sqlerrm;
    end;
  else
    raise notice 'pg_cron không có sẵn; bài cũ vẫn được xoá cơ hội khi tạo bài.';
  end if;
end;
$cron$;
