-- First, let's see what the current constraint allows
-- Then update it to include 'waiting' status

-- Drop the existing constraint
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_status_check;

-- Add the new constraint with all required status values
ALTER TABLE players ADD CONSTRAINT players_status_check 
CHECK (status IN ('available', 'in_progress', 'waiting', 'done'));