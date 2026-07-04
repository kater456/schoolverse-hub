-- 1. List affected vendors (for verification)
SELECT business_name, id, created_at
FROM public.vendors v
WHERE v.is_approved = false
AND NOT EXISTS (
  SELECT 1 FROM public.vendor_private_details pd WHERE pd.vendor_id = v.id
);

-- 2. Delete orphaned records (Run this only after verifying the list above)
-- DELETE FROM public.vendors v
-- WHERE v.is_approved = false
-- AND NOT EXISTS (
--   SELECT 1 FROM public.vendor_private_details pd WHERE pd.vendor_id = v.id
-- );
