-- Add plan fields to profiles table for 31-day plan management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON public.profiles(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.subscription_status IS 'Current subscription status: active, inactive, cancelled, expired';
COMMENT ON COLUMN public.profiles.plan_expires_at IS 'When the current plan expires';
COMMENT ON COLUMN public.profiles.plan_type IS 'Plan type: free, premium, trial';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Stripe subscription ID';
