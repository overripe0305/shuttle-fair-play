-- Create a default club and migrate existing data (fixed)
DO $$
DECLARE
    default_club_id UUID;
    first_profile_id UUID;
BEGIN
    -- Get the first user from profiles table
    SELECT id INTO first_profile_id FROM profiles LIMIT 1;
    
    -- If no profiles exist, we'll skip this migration
    IF first_profile_id IS NOT NULL THEN
        -- Create default club
        INSERT INTO public.clubs (name, description, owner_id)
        VALUES ('Default Badminton Club', 'Default club for existing data', first_profile_id)
        RETURNING id INTO default_club_id;

        -- Update all existing players to belong to default club
        UPDATE public.players SET club_id = default_club_id WHERE club_id IS NULL;

        -- Update all existing events to belong to default club
        UPDATE public.events SET club_id = default_club_id WHERE club_id IS NULL;
        
        -- Add the profile as a member of the default club
        INSERT INTO public.club_members (club_id, user_id, role) 
        VALUES (default_club_id, first_profile_id, 'owner');
    ELSE
        -- If no profiles exist, just ensure club_id columns are ready for new data
        -- New data will be created with proper club associations
        NULL;
    END IF;
END $$;