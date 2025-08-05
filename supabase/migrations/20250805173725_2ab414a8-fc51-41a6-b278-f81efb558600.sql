-- Add created_at timestamp to event_players table for chronological tracking
ALTER TABLE public.event_players 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;