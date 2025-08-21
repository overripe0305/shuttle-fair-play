-- Fix critical security vulnerability in event_payments table
-- Current policy allows public access to sensitive financial data

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on event_payments" ON public.event_payments;

-- Create secure RLS policies for event_payments table
-- These policies ensure financial data is only accessible to authenticated users
-- and implement proper access controls

-- Policy 1: Only authenticated users can view their own payment records
-- This requires implementing authentication, but provides the foundation
CREATE POLICY "Users can view their own payments" 
ON public.event_payments 
FOR SELECT 
TO authenticated
USING (auth.uid()::text = player_id::text);

-- Policy 2: Only authenticated users can insert their own payment records
CREATE POLICY "Users can insert their own payments" 
ON public.event_payments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = player_id::text);

-- Policy 3: Only authenticated users can update their own payment records
CREATE POLICY "Users can update their own payments" 
ON public.event_payments 
FOR UPDATE 
TO authenticated
USING (auth.uid()::text = player_id::text)
WITH CHECK (auth.uid()::text = player_id::text);

-- Policy 4: Prevent deletion of payment records for audit purposes
-- Only allow if user owns the record (but consider making this admin-only)
CREATE POLICY "Users can delete their own payments" 
ON public.event_payments 
FOR DELETE 
TO authenticated
USING (auth.uid()::text = player_id::text);

-- Create a function to check if a user is an admin (for future use)
-- This assumes you'll add a user roles system later
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- For now, return false since no admin system exists
  -- This can be updated when authentication and roles are implemented
  SELECT false;
$$;

-- Create admin policy for full access to payment records (when admin system is implemented)
CREATE POLICY "Admins can manage all payments" 
ON public.event_payments 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());