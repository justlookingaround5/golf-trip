-- Fix group_members RLS: the FOR ALL policy requires user to already be
-- owner/admin, which makes it impossible to insert the first member.
-- Split into explicit per-operation policies.

-- Drop the overly broad FOR ALL policy
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;

-- SELECT: members can view their own group's members (already exists, keep it)
-- The "Members can view group membership" policy already handles this.

-- INSERT: group creators OR existing owners/admins can add members
CREATE POLICY "Group creators and admins can add members"
  ON group_members FOR INSERT
  WITH CHECK (
    -- Group creator can always add members (solves chicken-and-egg for first member)
    group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
    OR
    -- Existing owners/admins can add members
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- UPDATE: only owners can change roles
CREATE POLICY "Group owners can update members"
  ON group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- DELETE: owners/admins can remove members, or users can remove themselves
CREATE POLICY "Group owners and admins can remove members"
  ON group_members FOR DELETE
  USING (
    -- Self-removal (leave group)
    user_id = auth.uid()
    OR
    -- Owners/admins can remove others
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
