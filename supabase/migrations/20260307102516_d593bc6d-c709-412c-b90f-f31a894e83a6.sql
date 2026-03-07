
-- Add trial columns to schools
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS payment_confirmed boolean DEFAULT false;

-- Add trial columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '7 days');

-- Function to check if a school's trial is still active
CREATE OR REPLACE FUNCTION public.is_school_trial_active(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = _school_id
    AND (payment_confirmed = true OR trial_ends_at > now())
  )
$$;

-- Function to check if a user's trial is still active
CREATE OR REPLACE FUNCTION public.is_trial_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
    AND (trial_ends_at > now() OR EXISTS (
      SELECT 1 FROM public.schools s
      JOIN public.profiles p ON p.school_id = s.id
      WHERE p.user_id = _user_id AND s.payment_confirmed = true
    ))
  )
$$;
