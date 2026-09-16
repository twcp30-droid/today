-- Opaque encrypted planner blobs. Clients never send plaintext tasks.
-- Run this in the Supabase SQL editor (free tier). No Auth users are required.

create table if not exists public.today_blobs (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  ciphertext text not null check (char_length(ciphertext) > 0 and char_length(ciphertext) <= 1000000),
  updated_at timestamptz not null
);

comment on table public.today_blobs is
  'AES-GCM envelopes for the Today PWA. id is SHA-256(app salt || passphrase).';

alter table public.today_blobs enable row level security;

revoke all on table public.today_blobs from public, anon, authenticated;

-- Defense in depth: even if table grants are added later, direct REST listing/writes fail.
drop policy if exists today_blobs_no_select on public.today_blobs;
drop policy if exists today_blobs_no_insert on public.today_blobs;
drop policy if exists today_blobs_no_update on public.today_blobs;
drop policy if exists today_blobs_no_delete on public.today_blobs;

create policy today_blobs_no_select on public.today_blobs for select to anon, authenticated using (false);
create policy today_blobs_no_insert on public.today_blobs for insert to anon, authenticated with check (false);
create policy today_blobs_no_update on public.today_blobs for update to anon, authenticated using (false) with check (false);
create policy today_blobs_no_delete on public.today_blobs for delete to anon, authenticated using (false);

create or replace function public.today_get_blob(blob_id text)
returns table (id text, ciphertext text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if blob_id is null or blob_id !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  return query
    select b.id, b.ciphertext, b.updated_at
    from public.today_blobs b
    where b.id = blob_id;
end;
$$;

create or replace function public.today_put_blob(
  blob_id text,
  blob_ciphertext text,
  blob_updated_at timestamptz
)
returns table (id text, ciphertext text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if blob_id is null or blob_id !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid blob id';
  end if;
  if blob_ciphertext is null or char_length(blob_ciphertext) = 0 or char_length(blob_ciphertext) > 1000000 then
    raise exception 'invalid ciphertext';
  end if;
  if blob_updated_at is null then
    raise exception 'updated_at required';
  end if;

  insert into public.today_blobs as t (id, ciphertext, updated_at)
  values (blob_id, blob_ciphertext, blob_updated_at)
  on conflict (id) do update
    set ciphertext = excluded.ciphertext,
        updated_at = excluded.updated_at
    where t.updated_at <= excluded.updated_at;

  return query
    select b.id, b.ciphertext, b.updated_at
    from public.today_blobs b
    where b.id = blob_id;
end;
$$;

revoke all on function public.today_get_blob(text) from public;
revoke all on function public.today_put_blob(text, text, timestamptz) from public;
grant execute on function public.today_get_blob(text) to anon;
grant execute on function public.today_put_blob(text, text, timestamptz) to anon;
