-- Create the agent-resources storage bucket
-- Run this in Supabase SQL Editor OR create manually in Dashboard

-- Note: Storage buckets are usually created via Dashboard UI, not SQL
-- Go to: https://supabase.com/dashboard/project/neeyzyrrxexfghagdgra/storage/buckets

-- Manual steps:
-- 1. Click "New bucket"
-- 2. Name: agent-resources
-- 3. Public bucket: YES (or configure RLS policies)
-- 4. Click "Create bucket"

-- If you want to create via SQL (requires storage schema access):
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-resources', 'agent-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Optional: Add RLS policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-resources');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agent-resources');

