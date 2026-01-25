-- Fix profiles insert policy to allow service role to create profiles
-- This is needed for the activate-account function to work

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policy that allows both users and service role
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Also ensure service role can bypass RLS entirely
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
