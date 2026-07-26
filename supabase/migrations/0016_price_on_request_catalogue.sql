-- Public pricing policy: all showroom products require a private quotation.
-- Remove numeric prices from the publication source, not only from the UI.
update public.products
set
  base_price = null,
  display_price = null,
  price_mode = 'on_request',
  price_on_request = true,
  discount_type = null,
  discount_value = 0,
  updated_at = now()
where deleted_at is null;
