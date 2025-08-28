-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create clubs table
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Create club_members table for multi-user clubs
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Enable RLS on club_members
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Add club_id to existing tables
ALTER TABLE public.events ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.players ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_clubs_owner_id ON public.clubs(owner_id);
CREATE INDEX idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX idx_events_club_id ON public.events(club_id);
CREATE INDEX idx_players_club_id ON public.players(club_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for clubs
CREATE POLICY "Users can view clubs they own or are members of" ON public.clubs
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (SELECT club_id FROM public.club_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create their own clubs" ON public.clubs
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Club owners can update their clubs" ON public.clubs
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Club owners can delete their clubs" ON public.clubs
  FOR DELETE USING (owner_id = auth.uid());

-- RLS Policies for club_members
CREATE POLICY "Users can view club members for their clubs" ON public.club_members
  FOR SELECT USING (
    club_id IN (
      SELECT id FROM public.clubs WHERE owner_id = auth.uid()
      UNION
      SELECT club_id FROM public.club_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Club owners can manage members" ON public.club_members
  FOR ALL USING (
    club_id IN (SELECT id FROM public.clubs WHERE owner_id = auth.uid())
  );

-- Update existing table policies to include club access
DROP POLICY IF EXISTS "Allow all operations on events" ON public.events;
CREATE POLICY "Users can manage events for their clubs" ON public.events
  FOR ALL USING (
    club_id IN (
      SELECT id FROM public.clubs WHERE owner_id = auth.uid()
      UNION
      SELECT club_id FROM public.club_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow all operations on players" ON public.players;
CREATE POLICY "Users can manage players for their clubs" ON public.players
  FOR ALL USING (
    club_id IN (
      SELECT id FROM public.clubs WHERE owner_id = auth.uid()
      UNION
      SELECT club_id FROM public.club_members WHERE user_id = auth.uid()
    )
  );

-- Update games policy to work with club-based events
DROP POLICY IF EXISTS "Allow all operations on games" ON public.games;
CREATE POLICY "Users can manage games for their club events" ON public.games
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events WHERE club_id IN (
        SELECT id FROM public.clubs WHERE owner_id = auth.uid()
        UNION
        SELECT club_id FROM public.club_members WHERE user_id = auth.uid()
      )
    )
  );

-- Update other related tables
DROP POLICY IF EXISTS "Allow all operations on event_players" ON public.event_players;
CREATE POLICY "Users can manage event players for their clubs" ON public.event_players
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events WHERE club_id IN (
        SELECT id FROM public.clubs WHERE owner_id = auth.uid()
        UNION
        SELECT club_id FROM public.club_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Allow all operations on waiting_matches" ON public.waiting_matches;
CREATE POLICY "Users can manage waiting matches for their clubs" ON public.waiting_matches
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events WHERE club_id IN (
        SELECT id FROM public.clubs WHERE owner_id = auth.uid()
        UNION
        SELECT club_id FROM public.club_members WHERE user_id = auth.uid()
      )
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();