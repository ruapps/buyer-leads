-- Buyers table
create table if not exists buyers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text not null,
  city text not null,
  property_type text not null,
  bhk text,
  purpose text not null,
  budget_min int,
  budget_max int,
  timeline text not null,
  source text not null,
  status text not null default 'New',
  notes text,
  tags text[],
  owner_id uuid not null,
  updated_at timestamptz not null default now()
);

-- Buyer history table
create table if not exists buyer_history (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references buyers(id) on delete cascade,
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  diff jsonb not null
);

-- Trigger to auto-update timestamp when buyer is updated
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_updated_at
before update on buyers
for each row
execute procedure touch_updated_at();
