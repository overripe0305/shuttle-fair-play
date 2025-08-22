-- Update RLS policies for event_payments to allow authenticated users to manage all payments
-- This is needed for billing management functionality where event organizers need to record payments for players

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.event_payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.event_payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.event_payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.event_payments;

-- Create new policies that allow authenticated users to manage all payments
CREATE POLICY "Authenticated users can view all payments" 
ON public.event_payments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert payments" 
ON public.event_payments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update payments" 
ON public.event_payments 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete payments" 
ON public.event_payments 
FOR DELETE 
USING (auth.uid() IS NOT NULL);