-- Fix avatars storage bucket and policies
-- This migration ensures the bucket works correctly for profile picture uploads

-- Create the avatars bucket (ignore if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies for the avatars bucket
DROP POLICY IF EXISTS "avatars_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Create a simple, permissive policy for authenticated users
CREATE POLICY "avatars_policy" ON storage.objects
  FOR ALL USING (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

-- Also allow public read access
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars'); 