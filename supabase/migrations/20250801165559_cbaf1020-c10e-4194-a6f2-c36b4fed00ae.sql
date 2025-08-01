-- Create games table for tracking active games
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  player3_id UUID NOT NULL,
  player4_id UUID NOT NULL,
  court_id INTEGER DEFAULT 1,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  winner TEXT NULL, -- 'team1' or 'team2'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add court_count to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS court_count INTEGER DEFAULT 4;

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create policies for games
CREATE POLICY "Allow all operations on games" 
ON public.games 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updating timestamps
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE events;

ALTER TABLE players REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

ALTER TABLE games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE games;