CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.system_config FROM anon, authenticated;
GRANT ALL ON public.system_config TO service_role;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.system_config (key, value)
VALUES ('push_system_key', '61b9289fc7bf4a3abd71c6a04038f018c9d5314dba085f6342d9e42094336ad3')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.dispatch_push(_title text, _body text, _url text, _school_id uuid DEFAULT NULL::uuid, _tag text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text := 'https://dsqqngfaxcuvcsawgenc.supabase.co/functions/v1/send-push';
  v_key text;
BEGIN
  SELECT value INTO v_key FROM public.system_config WHERE key = 'push_system_key';

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-system-key', COALESCE(v_key,'')
    ),
    body := jsonb_build_object('title',_title,'body',_body,'url',_url,'school_id',_school_id,'tag',_tag)
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$function$;