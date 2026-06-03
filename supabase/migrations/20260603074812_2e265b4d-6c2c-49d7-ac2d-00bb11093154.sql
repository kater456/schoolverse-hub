CREATE POLICY "Sub admins can update assigned school"
ON public.schools
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = schools.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'sub_admin'
      AND ur.assigned_school_id = schools.id
  )
);