-- Fix recursive role access and support secure role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_my_role_details()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role app_role,
  school_id uuid,
  assigned_school_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.id, ur.user_id, ur.role, ur.school_id, ur.assigned_school_id, ur.created_at
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY ur.created_at ASC
  LIMIT 1
$$;

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sub_admin')
);

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "School admins can manage school roles" ON public.user_roles;
CREATE POLICY "School admins can manage school roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_school_admin(auth.uid(), school_id))
WITH CHECK (public.is_school_admin(auth.uid(), school_id));

-- Make vendor approval workflow explicit and secure
ALTER TABLE public.vendor_private_details
ADD COLUMN IF NOT EXISTS id_document_url text;

ALTER TABLE public.vendor_applications
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users submit applications" ON public.vendor_applications;
CREATE POLICY "Users submit applications"
ON public.vendor_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own applications" ON public.vendor_applications;
CREATE POLICY "Users view own applications"
ON public.vendor_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins manage applications" ON public.vendor_applications;
CREATE POLICY "Super admins manage applications"
ON public.vendor_applications
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin review applications" ON public.vendor_applications;
CREATE POLICY "Admin review applications"
ON public.vendor_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Sub-admin review applications" ON public.vendor_applications;
CREATE POLICY "Sub-admin review applications"
ON public.vendor_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendor_applications.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendor_applications.school_id
  )
);

DROP POLICY IF EXISTS "Admins can view applications" ON public.vendor_applications;
CREATE POLICY "Admins can view applications"
ON public.vendor_applications
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = vendor_applications.school_id
  )
);

-- Add transaction workflow permissions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can create transactions" ON public.transactions;
CREATE POLICY "Buyers can create transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Buyers can view own transactions" ON public.transactions;
CREATE POLICY "Buyers can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Buyers can update own confirmations" ON public.transactions;
CREATE POLICY "Buyers can update own confirmations"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can view own transactions" ON public.transactions;
CREATE POLICY "Vendors can view own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = transactions.vendor_id
      AND v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Vendors can update own transactions" ON public.transactions;
CREATE POLICY "Vendors can update own transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = transactions.vendor_id
      AND v.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = transactions.vendor_id
      AND v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view transactions" ON public.transactions;
CREATE POLICY "Admins can view transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.vendors v ON v.school_id = ur.assigned_school_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND v.id = transactions.vendor_id
  )
);

DROP POLICY IF EXISTS "Set transaction status on update" ON public.transactions;
DROP TRIGGER IF EXISTS set_transaction_status_on_update ON public.transactions;
CREATE OR REPLACE FUNCTION public.sync_transaction_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.vendor_marked_delivered = true AND COALESCE(OLD.vendor_marked_delivered, false) = false THEN
    NEW.status := 'delivered';
  END IF;

  IF NEW.vendor_marked_delivered = true AND NEW.customer_confirmed = true THEN
    NEW.status := 'completed';
  ELSIF NEW.customer_confirmed = true AND COALESCE(OLD.customer_confirmed, false) = false AND NEW.vendor_marked_delivered = true THEN
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_transaction_status_on_update
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_transaction_status();

-- Secure Amazon-style vendor ratings based on completed transactions only
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can rate" ON public.vendor_ratings;
CREATE POLICY "Auth users can rate"
ON public.vendor_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.vendor_id = vendor_ratings.vendor_id
      AND t.user_id = auth.uid()
      AND t.status = 'completed'
  )
);

DROP POLICY IF EXISTS "Users can update own rating" ON public.vendor_ratings;
CREATE POLICY "Users can update own rating"
ON public.vendor_ratings
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.vendor_id = vendor_ratings.vendor_id
      AND t.user_id = auth.uid()
      AND t.status = 'completed'
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.vendor_id = vendor_ratings.vendor_id
      AND t.user_id = auth.uid()
      AND t.status = 'completed'
  )
);

DROP POLICY IF EXISTS "Users can delete own rating" ON public.vendor_ratings;
CREATE POLICY "Users can delete own rating"
ON public.vendor_ratings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view ratings" ON public.vendor_ratings;
CREATE POLICY "Anyone can view ratings"
ON public.vendor_ratings
FOR SELECT
TO public
USING (true);

-- Ensure Caleb remains the super admin
DO $$
DECLARE
  caleb_user_id uuid;
BEGIN
  SELECT id INTO caleb_user_id
  FROM auth.users
  WHERE email = 'calebworks4@gmail.com'
  LIMIT 1;

  IF caleb_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = caleb_user_id
        AND role = 'super_admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (caleb_user_id, 'super_admin');
    END IF;
  END IF;
END $$;