-- The supported demo seed is `npm run seed` (scripts/seed.ts).
-- It creates auth users through the Admin API, which stays compatible
-- with GoTrue schema changes. This file is a no-op so `supabase db reset`
-- still succeeds. Do not put the demo password in SQL.
select 1;
