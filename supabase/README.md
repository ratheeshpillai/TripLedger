# Supabase schema workflow

`migrations/` is the canonical TripLedger schema history. A fresh local Supabase database must be built by replaying those files in filename order.

`bills.sql` and `phase1_mfa_rls.sql` are retained only as historical SQL Editor references. Do not run them when creating a new environment; their definitions are included in `migrations/20260711000000_tripledger_schema_baseline.sql`.

After installing the Supabase CLI and starting Docker, verify the chain and generate infrastructure-only TypeScript types with:

```sh
supabase init
supabase start
supabase db reset --local
supabase gen types typescript --local --schema public > src/repositories/supabase/database.types.ts
```

Do not hand-edit or manually recreate `database.types.ts`. Regenerate it after every schema change, then keep database types inside `src/repositories/supabase/` and map them to the existing domain models in repository implementations.

Before applying this normalized migration history to an existing linked project, compare its recorded migration versions with `supabase migration list`. If the old date-only versions were recorded remotely, reconcile the history deliberately before `db push`; never reset a production project.
