-- 033_system_message_types.sql
-- Add system_type column to trip_messages for distinct event-type styling

ALTER TABLE trip_messages ADD COLUMN IF NOT EXISTS system_type text;
