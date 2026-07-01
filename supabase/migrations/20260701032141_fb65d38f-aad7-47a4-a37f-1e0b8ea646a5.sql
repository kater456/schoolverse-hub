CREATE UNIQUE INDEX IF NOT EXISTS subscription_events_paystack_ref_success_uniq
ON public.subscription_events (paystack_ref)
WHERE paystack_ref IS NOT NULL AND event_type IN ('charge.success','subscription.create','subscription.verify.success');