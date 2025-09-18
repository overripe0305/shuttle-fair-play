-- Add tournament support to events table
ALTER TABLE public.events ADD COLUMN event_type text NOT NULL DEFAULT 'regular' CHECK (event_type IN ('regular', 'tournament'));
ALTER TABLE public.events ADD COLUMN tournament_config jsonb NULL;

-- Create tournaments table for detailed tournament data
CREATE TABLE public.tournaments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tournament_type text NOT NULL CHECK (tournament_type IN ('single_stage', 'double_stage')),
  stage_config jsonb NOT NULL DEFAULT '{}',
  current_stage text NOT NULL DEFAULT 'setup' CHECK (current_stage IN ('setup', 'group_stage', 'elimination_stage', 'completed')),
  participants jsonb NOT NULL DEFAULT '[]',
  brackets jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Create policies for tournaments
CREATE POLICY "Users can manage tournaments for their clubs" 
ON public.tournaments 
FOR ALL 
USING (event_id IN (
  SELECT events.id 
  FROM events 
  WHERE events.club_id IN (
    SELECT clubs.id 
    FROM clubs 
    WHERE clubs.owner_id = auth.uid()
    UNION
    SELECT club_members.club_id 
    FROM club_members 
    WHERE club_members.user_id = auth.uid()
  )
));

-- Create tournament_matches table for tracking matches
CREATE TABLE public.tournament_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('group_stage', 'elimination_stage')),
  round_number integer NOT NULL DEFAULT 1,
  match_number integer NOT NULL DEFAULT 1,
  participant1_id uuid NULL, -- Can be null for BYE matches
  participant2_id uuid NULL,
  participant1_score integer NULL,
  participant2_score integer NULL,
  winner_id uuid NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'walkover', 'forfeit', 'bye')),
  scheduled_time timestamp with time zone NULL,
  completed_time timestamp with time zone NULL,
  group_id text NULL, -- For group stage matches
  bracket_position text NULL, -- For elimination matches (e.g., 'winners_r1_m1', 'losers_r2_m3')
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for tournament_matches
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Create policies for tournament_matches
CREATE POLICY "Users can manage tournament matches for their clubs" 
ON public.tournament_matches 
FOR ALL 
USING (tournament_id IN (
  SELECT tournaments.id 
  FROM tournaments 
  JOIN events ON tournaments.event_id = events.id 
  WHERE events.club_id IN (
    SELECT clubs.id 
    FROM clubs 
    WHERE clubs.owner_id = auth.uid()
    UNION
    SELECT club_members.club_id 
    FROM club_members 
    WHERE club_members.user_id = auth.uid()
  )
));

-- Create tournament_participants table to track participant registration
CREATE TABLE public.tournament_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  seed_number integer NULL,
  group_id text NULL,
  eliminated_at timestamp with time zone NULL,
  final_position integer NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, player_id)
);

-- Enable RLS for tournament_participants
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for tournament_participants
CREATE POLICY "Users can manage tournament participants for their clubs" 
ON public.tournament_participants 
FOR ALL 
USING (tournament_id IN (
  SELECT tournaments.id 
  FROM tournaments 
  JOIN events ON tournaments.event_id = events.id 
  WHERE events.club_id IN (
    SELECT clubs.id 
    FROM clubs 
    WHERE clubs.owner_id = auth.uid()
    UNION
    SELECT club_members.club_id 
    FROM club_members 
    WHERE club_members.user_id = auth.uid()
  )
));

-- Add update triggers
CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_matches_updated_at
BEFORE UPDATE ON public.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_participants_updated_at
BEFORE UPDATE ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();