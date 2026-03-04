-- Fix: Group creator can't see their own group after creation.
-- The existing FOR ALL policy's USING clause isn't reliably applied
-- to SELECT when a separate FOR SELECT policy also exists.
-- Add an explicit FOR SELECT policy for the creator.

CREATE POLICY "Group creator can view own groups"
  ON groups FOR SELECT
  USING (created_by = auth.uid());
