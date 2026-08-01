-- Migration: Add store_upgrade_source column to public.vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS store_upgrade_source TEXT CHECK (store_upgrade_source IN ('admin_grant', 'paystack'));

-- Enforce server-side security via database trigger to prevent unauthorized users from writing to critical fields
CREATE OR REPLACE FUNCTION public.check_vendor_store_upgrade_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_store_upgraded IS DISTINCT FROM OLD.is_store_upgraded OR
      NEW.store_upgrade_expires_at IS DISTINCT FROM OLD.store_upgrade_expires_at OR
      NEW.store_upgrade_source IS DISTINCT FROM OLD.store_upgrade_source) THEN

    -- Service role and superusers always bypass
    IF current_setting('role', true) IN ('service_role', 'postgres') THEN
      RETURN NEW;
    END IF;

    -- If auth.uid() is null, allow (system operations)
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- Otherwise, enforce admin/super_admin/sub_admin role
    IF NOT (
      public.is_super_admin(auth.uid()) OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'sub_admin')
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify store upgrade details.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_vendor_store_upgrade_permissions ON public.vendors;
CREATE TRIGGER enforce_vendor_store_upgrade_permissions
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vendor_store_upgrade_permissions();
