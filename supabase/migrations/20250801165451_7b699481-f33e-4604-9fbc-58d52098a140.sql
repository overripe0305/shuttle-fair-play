-- Add court_count to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS court_count INTEGER DEFAULT 4;

-- Add court_id and start_time to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS court_id INTEGER DEFAULT 1;
ALTER TABLE games ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Enable realtime for events table
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Enable realtime for players table  
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Enable realtime for games table
ALTER TABLE games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE games;