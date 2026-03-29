
-- Add new profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

-- Remove jersey_number, position, team_name from profiles (no longer needed)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS jersey_number,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS team_name;

-- Expand teams table with all new fields
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS field_name text,
  ADD COLUMN IF NOT EXISTS field_address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS foundation_date date,
  ADD COLUMN IF NOT EXISTS founder_name text,
  ADD COLUMN IF NOT EXISTS war_cry text,
  ADD COLUMN IF NOT EXISTS coach_name text,
  ADD COLUMN IF NOT EXISTS admin_name text,
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS admin_phone text,
  ADD COLUMN IF NOT EXISTS substitute_name text,
  ADD COLUMN IF NOT EXISTS president_name text,
  ADD COLUMN IF NOT EXISTS president_email text;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true) ON CONFLICT (id) DO NOTHING;

-- RLS for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS for team-logos bucket
CREATE POLICY "Anyone can view team logos" ON storage.objects FOR SELECT USING (bucket_id = 'team-logos');
CREATE POLICY "Auth users can upload team logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'team-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can update team logos" ON storage.objects FOR UPDATE USING (bucket_id = 'team-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can delete team logos" ON storage.objects FOR DELETE USING (bucket_id = 'team-logos' AND auth.role() = 'authenticated');
