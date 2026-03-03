-- ============================================================================
-- Migration 011: Photo storage bucket
-- ============================================================================

-- Create a public bucket for trip photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos',
  'trip-photos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- Storage policies
CREATE POLICY "Public read trip photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-photos');

CREATE POLICY "Authenticated upload trip photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trip-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete trip photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trip-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
