-- Migration to automatically upgrade legacy standalone store upgraded vendors to the Pro subscription plan
UPDATE public.vendors
SET
  subscription_plan = 'pro',
  subscription_status = 'active',
  subscription_start = COALESCE(subscription_start, now()),
  subscription_expires = COALESCE(store_upgrade_expires_at, now() + INTERVAL '1 year')
WHERE
  is_store_upgraded = true
  AND (store_upgrade_expires_at IS NULL OR store_upgrade_expires_at > now());
