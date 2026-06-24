-- Parent outreach contacts (imported from email lists for sales nurture)

create table if not exists outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text,
  notes text,
  source text not null default 'import',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'replied', 'not_interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists outreach_contacts_email_unique
  on outreach_contacts (email);

create index if not exists outreach_contacts_status_idx on outreach_contacts (status);
create index if not exists outreach_contacts_created_idx on outreach_contacts (created_at desc);

alter table outreach_contacts enable row level security;

revoke all on table outreach_contacts from anon;
grant select, insert, update, delete on table outreach_contacts to service_role;
