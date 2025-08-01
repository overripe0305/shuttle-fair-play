-- Add payment tracking columns to players table
ALTER TABLE public.players 
ADD COLUMN payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
ADD COLUMN payment_method text CHECK (payment_method IN ('cash', 'online')),
ADD COLUMN payment_date timestamp with time zone,
ADD COLUMN total_minutes_played integer DEFAULT 0,
ADD COLUMN wins integer DEFAULT 0,
ADD COLUMN losses integer DEFAULT 0;

-- Add event payment tracking table
CREATE TABLE public.event_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL,
  player_id uuid NOT NULL,
  amount decimal(10,2),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'online')),
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on event_payments
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for event_payments
CREATE POLICY "Allow all operations on event_payments" 
ON public.event_payments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at on event_payments
CREATE TRIGGER update_event_payments_updated_at
BEFORE UPDATE ON public.event_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create waiting matches table to support multiple matches
CREATE TABLE public.waiting_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL,
  player1_id uuid NOT NULL,
  player2_id uuid NOT NULL,
  player3_id uuid NOT NULL,
  player4_id uuid NOT NULL,
  match_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on waiting_matches
ALTER TABLE public.waiting_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for waiting_matches
CREATE POLICY "Allow all operations on waiting_matches" 
ON public.waiting_matches 
FOR ALL 
USING (true) 
WITH CHECK (true);