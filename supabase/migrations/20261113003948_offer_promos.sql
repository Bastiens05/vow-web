-- Promos facultatives sur les offres de vitrine.
-- Les policies existantes de vendor_offers restent en place.

alter table public.vendor_offers
  add column if not exists promo_kind text,
  add column if not exists promo_value integer,
  add column if not exists promo_label text not null default '',
  add column if not exists promo_starts_on date,
  add column if not exists promo_ends_on date;

alter table public.vendor_offers
  drop constraint if exists vendor_offers_promo_shape;

alter table public.vendor_offers
  add constraint vendor_offers_promo_shape check (
    (
      promo_kind is null
      and promo_value is null
      and promo_starts_on is null
      and promo_ends_on is null
      and promo_label = ''
    )
    or (
      promo_kind in ('percent', 'amount')
      and promo_value is not null
      and (
        (promo_kind = 'percent' and promo_value between 1 and 90)
        or (promo_kind = 'amount' and promo_value > 0)
      )
      and char_length(promo_label) <= 80
      and (promo_starts_on is null or promo_ends_on is null or promo_ends_on >= promo_starts_on)
    )
  );
