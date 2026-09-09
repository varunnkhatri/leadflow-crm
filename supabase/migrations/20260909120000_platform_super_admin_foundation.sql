alter table public.users add column if not exists platform_role text not null default 'USER' check (platform_role in ('USER','SUPER_ADMIN'));

create index if not exists users_platform_role_idx on public.users(platform_role) where platform_role = 'SUPER_ADMIN';

create or replace function public.is_platform_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.platform_role = 'SUPER_ADMIN'
      and u.is_active = true
  );
$$;

revoke all on function public.is_platform_super_admin() from public;
grant execute on function public.is_platform_super_admin() to authenticated;

create or replace function public.get_platform_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if not public.is_platform_super_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'businesses', (select count(*) from public.businesses where deleted_at is null),
    'active_businesses', (select count(*) from public.businesses where deleted_at is null and is_active = true),
    'users', (select count(*) from public.users where is_active = true),
    'leads', (select count(*) from public.leads where deleted_at is null),
    'customers', (select count(*) from public.customers where deleted_at is null),
    'hot_leads', (select count(*) from public.leads where deleted_at is null and upper(coalesce(temperature,'')) = 'HOT'),
    'business_list', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select b.id, b.name, b.industry, b.website, b.is_active, b.created_at,
             (select count(*) from public.users u where u.business_id = b.id and u.is_active = true) as user_count,
             (select count(*) from public.leads l where l.business_id = b.id and l.deleted_at is null) as lead_count,
             (select count(*) from public.customers c where c.business_id = b.id and c.deleted_at is null) as customer_count
      from public.businesses b
      where b.deleted_at is null
      order by b.created_at desc
      limit 100
    ) x), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_platform_overview() from public;
grant execute on function public.get_platform_overview() to authenticated;
