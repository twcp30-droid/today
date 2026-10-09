-- Fix Postgres 42702: column reference "id" is ambiguous
-- (PL/pgSQL RETURNS TABLE variables vs table columns, especially ON CONFLICT (id)).
-- Safe to re-run in the SQL editor if 001 was already applied.
-- New installs should run 001 only; it already includes this fix.

create or replace function public.today_get_blob(blob_id text)
returns table (id text, ciphertext text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
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
#variable_conflict use_column
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
