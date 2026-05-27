-- Marketing leads (lead magnets, nurture) — separate from enrollment_leads checkout funnel

create table if not exists prospective_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  source text not null,
  magnet_slug text not null,
  resend_message_id text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists prospective_leads_email_idx on prospective_leads (lower(email));
create index if not exists prospective_leads_magnet_idx on prospective_leads (magnet_slug);
create index if not exists prospective_leads_created_idx on prospective_leads (created_at desc);

alter table prospective_leads enable row level security;

revoke all on table prospective_leads from anon;
grant select, insert, update on table prospective_leads to service_role;
