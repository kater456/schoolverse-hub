-- Add edit/delete columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Create vendor presence table for online status
CREATE TABLE IF NOT EXISTS public.vendor_presence (
  user_id uuid PRIMARY KEY,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false
);

ALTER TABLE public.vendor_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vendor presence"
ON public.vendor_presence FOR SELECT TO public
USING (true);

CREATE POLICY "Users can upsert own presence"
ON public.vendor_presence FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
ON public.vendor_presence FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for vendor_presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_presence;