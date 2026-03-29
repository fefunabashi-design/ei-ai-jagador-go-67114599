
-- Chat messages table
CREATE TABLE public.match_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages viewable by everyone" ON public.match_chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.match_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_chat_messages;

-- Payments / Vaquinha table
CREATE TABLE public.match_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.match_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by everyone" ON public.match_payments FOR SELECT TO public USING (true);
CREATE POLICY "Team owners can manage payments" ON public.match_payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
    WHERE m.id = match_payments.match_id AND t.owner_id = auth.uid()
  )
);
CREATE POLICY "Team owners can update payments" ON public.match_payments FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.matches m JOIN public.teams t ON t.id = m.home_team_id
    WHERE m.id = match_payments.match_id AND t.owner_id = auth.uid()
  )
);
CREATE POLICY "Players can update own payment" ON public.match_payments FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = match_payments.player_id AND p.user_id = auth.uid()
  )
);
