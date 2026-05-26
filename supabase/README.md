# Supabase CLI

Run all Supabase commands from the **repository root** (`ilithiyana/`), not from this folder:

```bash
cd ~/dev/seo/ilithiyana
supabase db push
supabase migration list
```

If you see *"Remote migration versions not found in local migrations directory"*, you are almost certainly in the wrong directory. `cd` to the repo root and run again.

Migrations live in `./supabase/migrations/` relative to the repo root.

## Empty application data (dev)

Delete rows only (tables and the `packages` catalog stay):

```bash
npm run db:empty              # dry-run counts
npm run db:empty -- --confirm # delete rows
```

Options: `--keep-class-catalog`, `--purge-auth`. SQL alternative: `scripts/empty-database.sql` in the Supabase SQL editor.
