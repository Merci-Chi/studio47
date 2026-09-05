create table if not exists public.appointment_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  client_name text not null,
  phone text not null,
  appointment_date date not null,
  appointment_time time not null,
  appointment_at timestamptz generated always as
    ((appointment_date + appointment_time) at time zone 'America/Los_Angeles') stored,
  enabled boolean not null default true,
  sent_24h boolean not null default false,
  sent_2h boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointment_push_subscriptions enable row level security;
revoke all on public.appointment_push_subscriptions from anon, authenticated;

create or replace function public.save_appointment_push_subscription(
  p_endpoint text,
  p_subscription jsonb,
  p_client_name text,
  p_phone text,
  p_appointment_date date,
  p_appointment_time time
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare saved_id uuid;
begin
  if length(trim(coalesce(p_endpoint,''))) < 20 then raise exception 'Invalid notification subscription'; end if;
  if length(trim(coalesce(p_client_name,''))) < 2 then raise exception 'Invalid client name'; end if;
  if length(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g')) < 7 then raise exception 'Invalid phone number'; end if;
  if p_appointment_date < current_date then raise exception 'Invalid appointment date'; end if;

  insert into public.appointment_push_subscriptions(endpoint,subscription,client_name,phone,appointment_date,appointment_time)
  values(p_endpoint,p_subscription,left(trim(p_client_name),80),left(trim(p_phone),30),p_appointment_date,p_appointment_time)
  on conflict(endpoint) do update set
    subscription=excluded.subscription,
    client_name=excluded.client_name,
    phone=excluded.phone,
    appointment_date=excluded.appointment_date,
    appointment_time=excluded.appointment_time,
    enabled=true,
    sent_24h=false,
    sent_2h=false,
    updated_at=now()
  returning id into saved_id;
  return saved_id;
end;
$$;

revoke all on function public.save_appointment_push_subscription(text,jsonb,text,text,date,time) from public;
grant execute on function public.save_appointment_push_subscription(text,jsonb,text,text,date,time) to anon, authenticated;

create index if not exists appointment_push_due_idx
on public.appointment_push_subscriptions(appointment_at)
where enabled = true;
