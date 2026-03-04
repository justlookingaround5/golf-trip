-- Fix infinite recursion in group_members RLS.
-- A SECURITY DEFINER function bypasses RLS on the table it queries,
-- breaking the recursive cycle where group_members policy references itself.

CREATE OR REPLACE FUNCTION public.is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

-- Replace the recursive group_members SELECT policy
DROP POLICY IF EXISTS "Members can view group membership" ON group_members;

CREATE POLICY "Members can view group membership"
  ON group_members FOR SELECT
  USING (public.is_group_member(group_id));

-- Replace groups SELECT policy to also use the function
DROP POLICY IF EXISTS "Members can view their groups" ON groups;

CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_group_member(id)
  );
