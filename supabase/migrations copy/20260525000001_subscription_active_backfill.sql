-- Must run in a separate migration from ADD VALUE 'active' (PostgreSQL 55P04)

update subscriptions
set status = 'active'
where status = 'paid';
