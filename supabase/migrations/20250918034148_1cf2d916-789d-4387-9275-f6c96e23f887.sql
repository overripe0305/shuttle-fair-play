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

-- Allow public read access to game_reports table if it exists
CREATE POLICY "Allow public read access to game_reports" 
ON public.game_reports 
FOR SELECT 
TO anon 
USING (true);