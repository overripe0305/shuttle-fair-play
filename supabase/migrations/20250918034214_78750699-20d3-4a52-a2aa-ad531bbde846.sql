-- Create policies for public read access to allow player ranking pages to work without authentication

-- Allow public read access to events table
CREATE POLICY "Allow public read access to events" 
ON public.events 
FOR SELECT 
TO anon 
USING (true);

-- Allow public read access to event_players table
CREATE POLICY "Allow public read access to event_players" 
ON public.event_players 
FOR SELECT 
TO anon 
USING (true);

-- Allow public read access to players table
CREATE POLICY "Allow public read access to players" 
ON public.players 
FOR SELECT 
TO anon 
USING (true);

-- Allow public read access to games table (used for player stats)
CREATE POLICY "Allow public read access to games" 
ON public.games 
FOR SELECT 
TO anon 
USING (true);