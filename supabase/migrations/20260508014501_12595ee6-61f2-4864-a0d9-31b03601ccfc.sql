
DROP POLICY IF EXISTS "Team owners can upload team logo" ON storage.objects;
CREATE POLICY "Team owners can upload team logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = (storage.foldername(storage.objects.name))[1]
        AND t.owner_id = auth.uid()
    )
  );
