-- Allow admins to view all vendor private details
CREATE POLICY "Admins can view vendor private details"
ON public.vendor_private_details
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow sub_admins to view private details for vendors in their assigned school
CREATE POLICY "Sub admins can view school vendor private details"
ON public.vendor_private_details
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN vendors v ON v.id = vendor_private_details.vendor_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = v.school_id
  )
);