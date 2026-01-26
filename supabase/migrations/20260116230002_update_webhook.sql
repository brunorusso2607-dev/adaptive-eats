-- Update webhook to properly handle subscription events and update profiles

-- Create function to handle subscription updates
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table when subscription is created/updated
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
