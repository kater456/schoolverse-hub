-- Add academic_level and department columns to vendors table
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS academic_level TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;
