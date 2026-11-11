-- Vendor tiers. Essentiel is the current plan. Pro and Studio exist
-- so features can be gated later. Their prices are not stored here.

alter table public.vendor_billing
  add column if not exists plan text not null default 'essentiel';

alter table public.vendor_billing
  drop constraint if exists vendor_billing_plan;

alter table public.vendor_billing
  add constraint vendor_billing_plan check (plan in ('essentiel', 'pro', 'studio'));
