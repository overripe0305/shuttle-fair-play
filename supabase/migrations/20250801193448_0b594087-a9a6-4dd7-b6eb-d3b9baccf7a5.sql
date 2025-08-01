-- Ensure the games table has REPLICA IDENTITY FULL for real-time updates
ALTER TABLE games REPLICA IDENTITY FULL;