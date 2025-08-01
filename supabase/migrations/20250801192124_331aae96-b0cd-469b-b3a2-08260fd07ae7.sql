-- Update the events table to include 'ended' status
-- This is for proper event lifecycle management

-- First let's check the current constraint (if any) and update it
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add a new constraint that includes 'ended' status
ALTER TABLE events ADD CONSTRAINT events_status_check 
CHECK (status IN ('upcoming', 'active', 'completed', 'ended'));

-- Update any events that might be 'completed' to 'ended' for consistency
-- (this is optional, but helps with the new naming convention)
UPDATE events SET status = 'ended' WHERE status = 'completed';