create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  'https://wfxuxrvygyzonkflpwoq.supabase.co',
  'studio47_project_url'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'studio47_project_url'
);

select vault.create_secret(
  'sb_publishable_e2h4t8AvCobzftt36UrDbw_NJGq8qlJ',
  'studio47_publishable_key'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'studio47_publishable_key'
);

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'studio47-appointment-reminders') then
    perform cron.schedule(
      'studio47-appointment-reminders',
      '*/15 * * * *',
      $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'studio47_project_url') || '/functions/v1/send-appointment-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'studio47_publishable_key')
        ),
        body := jsonb_build_object('scheduled_at', now())
      );
      $job$
    );
  end if;
end;
$$;
