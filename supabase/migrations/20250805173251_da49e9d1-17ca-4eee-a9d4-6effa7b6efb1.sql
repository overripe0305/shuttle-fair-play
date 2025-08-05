-- Add queue_fee column to events table
ALTER TABLE public.events 
ADD COLUMN queue_fee DECIMAL(10,2) DEFAULT 0.00;