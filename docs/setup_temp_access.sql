-- 1. Create a table to store temporary credentials directly linked to the Stripe Session
create table if not exists public.payment_temp_access (
  session_id text primary key,
  email text not null,
  temp_password text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS (Security)
alter table public.payment_temp_access enable row level security;

-- 2. Create a secure function to fetch credentials (and auto-delete them for security? Optional)
-- For now, we just read them. The user sees them once.
create or replace function get_temp_access(p_session_id text)
returns json
language plpgsql
security definer -- Runs with admin privileges to read the table
as $$
declare
  result json;
begin
  select json_build_object(
    'email', email,
    'temp_password', temp_password
  )
  into result
  from public.payment_temp_access
  where session_id = p_session_id;

  return result;
end;
$$;

-- Grant access to public (anon) so the Success page can call it
grant execute on function get_temp_access(text) to anon;
grant execute on function get_temp_access(text) to authenticated;
grant select on public.payment_temp_access to service_role; -- Webhook needs write access
grant insert on public.payment_temp_access to service_role;
