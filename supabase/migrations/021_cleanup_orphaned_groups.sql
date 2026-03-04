-- Clean up orphaned groups (created but never got a member due to RLS bug)
DELETE FROM groups
WHERE id NOT IN (SELECT DISTINCT group_id FROM group_members);
