-- Add 'paused' to the allowed status values
ALTER TABLE public.players DROP CONSTRAINT players_status_check;

ALTER TABLE public.players ADD CONSTRAINT players_status_check 
CHECK (status = ANY (ARRAY['available'::text, 'in_progress'::text, 'waiting'::text, 'done'::text, 'paused'::text]));