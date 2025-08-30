-- Fix infinite recursion in clubs and club_members RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view clubs they own or are members of" ON public.clubs;
DROP POLICY IF EXISTS "Users can view club members for their clubs" ON public.club_members;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_club_owner(_club_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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
AS $$
  SELECT ARRAY(
    SELECT id FROM public.clubs WHERE owner_id = _user_id
    UNION
    SELECT club_id FROM public.club_members WHERE user_id = _user_id
  );
$$;

-- Create new non-recursive policies for clubs
CREATE POLICY "Users can view clubs they own or are members of"
ON public.clubs
FOR SELECT
USING (
  owner_id = auth.uid() OR 
  public.is_club_member(id, auth.uid())
);

-- Create new non-recursive policies for club_members
CREATE POLICY "Users can view club members for their clubs"
ON public.club_members
FOR SELECT
USING (
  public.is_club_owner(club_id, auth.uid()) OR
  user_id = auth.uid()
);

-- Update other club_members policies to use the new functions
DROP POLICY IF EXISTS "Club owners can manage members" ON public.club_members;
CREATE POLICY "Club owners can manage members"
ON public.club_members
FOR ALL
USING (public.is_club_owner(club_id, auth.uid()));