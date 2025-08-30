-- Fix security warnings by setting search_path for functions

-- Update existing functions to include search_path
CREATE OR REPLACE FUNCTION public.is_club_owner(_club_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE id = _club_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_member(_club_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_id = _club_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_club_ids(_user_id uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT id FROM public.clubs WHERE owner_id = _user_id
    UNION
    SELECT club_id FROM public.club_members WHERE user_id = _user_id
  );
$$;