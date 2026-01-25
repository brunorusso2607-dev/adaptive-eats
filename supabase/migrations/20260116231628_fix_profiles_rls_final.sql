-- Final fix for profiles RLS policy to allow service role
-- This resolves "Database error creating new user"

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policy that allows both users and service role
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

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

-- Create function to handle subscription updates
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.profiles 
        SET 
            subscription_status = CASE 
                WHEN NEW.is_active = true THEN 'active'
                ELSE 'inactive'
            END,
            plan_expires_at = CASE 
                WHEN NEW.is_active = true THEN 
                    (CURRENT_TIMESTAMP + INTERVAL '31 days')
                ELSE NULL
            END,
            plan_type = CASE 
                WHEN NEW.is_active = true THEN 'premium'
                ELSE 'free'
            END,
            stripe_customer_id = NEW.stripe_customer_id,
            stripe_subscription_id = NEW.stripe_subscription_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update profiles when user_subscriptions changes
DROP TRIGGER IF EXISTS update_profile_on_subscription_change ON public.user_subscriptions;
CREATE TRIGGER update_profile_on_subscription_change
    AFTER INSERT OR UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_subscription_update();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_subscription_update() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_subscription_update() TO service_role;