
-- Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.match_payments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.mensalidades;
ALTER PUBLICATION supabase_realtime DROP TABLE public.debitos;

-- Force-recreate broken team logo policies (previous DROP didn't take effect on these)
DROP POLICY IF EXISTS "Team owners can delete team logo" ON storage.objects;
DROP POLICY IF EXISTS "Team owners can update team logo" ON storage.objects;

CREATE POLICY "Team owners can delete team logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = (storage.foldername(storage.objects.name))[1]
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update team logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE (t.id)::text = (storage.foldername(storage.objects.name))[1]
        AND t.owner_id = auth.uid()
    )
  );
