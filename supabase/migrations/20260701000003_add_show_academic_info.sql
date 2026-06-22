-- Add show_academic_info column to vendors table
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS show_academic_info BOOLEAN NOT NULL DEFAULT false;
