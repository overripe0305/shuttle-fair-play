-- Enable real-time for the games table to ensure immediate sync
ALTER TABLE games REPLICA IDENTITY FULL;

-- Add the games table to the supabase_realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE games;