-- Add last_notified_milestone column to vendors table
ALTER TABLE public.vendors ADD COLUMN last_notified_milestone INTEGER DEFAULT 0;
