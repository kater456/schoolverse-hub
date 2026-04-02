
-- Ensure profiles.user_id is unique
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add FK from vendor_comments.user_id to profiles.user_id
ALTER TABLE public.vendor_comments
  ADD CONSTRAINT vendor_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
