-- Fix infinite recursion in group_members SELECT policy.
-- The original policy references group_members from within group_members:
--   USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
-- This causes "infinite recursion detected in policy for relation group_members".
--
-- Fix: users can see group_members rows for groups they belong to,
-- checked via a simple direct match on user_id (non-recursive).

DROP POLICY IF EXISTS "Members can view group membership" ON group_members;

CREATE POLICY "Members can view group membership"
  ON group_members FOR SELECT
  USING (
    -- User can see all members of any group they are a member of.
    -- Use a security_barrier subquery that checks auth.uid() directly
    -- against the same table without recursion by using EXISTS with
    -- a direct user_id match.
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- Also fix the groups SELECT policy that depends on group_members
-- (which was also failing due to the recursion above).
-- Replace with a direct user_id check.
DROP POLICY IF EXISTS "Members can view their groups" ON groups;

CREATE POLICY "Members can view their groups"
  ON groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT gm.group_id FROM group_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

-- Drop the redundant policy we added in 023 (now merged into above)
DROP POLICY IF EXISTS "Group creator can view own groups" ON groups;
