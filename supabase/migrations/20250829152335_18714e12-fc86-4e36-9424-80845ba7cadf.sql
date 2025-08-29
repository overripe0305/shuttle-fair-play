-- Create a default club and migrate existing data
DO $$
DECLARE
    default_club_id UUID;
    first_user_id UUID;
BEGIN
    -- Get the first user from auth.users (or create a dummy one if none exists)
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, we'll skip this migration
    IF first_user_id IS NOT NULL THEN
        -- Create default club
        INSERT INTO public.clubs (name, description, owner_id)
        VALUES ('Default Badminton Club', 'Default club for existing data', first_user_id)
        RETURNING id INTO default_club_id;

        -- Update all existing players to belong to default club
        UPDATE public.players SET club_id = default_club_id WHERE club_id IS NULL;

        -- Update all existing events to belong to default club
        UPDATE public.events SET club_id = default_club_id WHERE club_id IS NULL;
    END IF;
END $$;