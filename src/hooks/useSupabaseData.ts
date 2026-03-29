import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ==================== AUTH HOOK ====================
export const useAuth = () => {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
};

// ==================== PROFILE ====================
export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (updates: {
      display_name?: string;
      nickname?: string;
      phone?: string;
      birth_date?: string;
      region?: string;
      avatar_url?: string;
      role?: string;
      is_pro?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Perfil atualizado! ✅" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("user_id", user.id);
      if (error) throw error;
      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Foto atualizada! 📸" });
    },
    onError: (error) => {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    },
  });
};

// ==================== TEAMS ====================
export const useMyTeam = () => {
  return useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      // First check if user owns a team
      const { data: ownedTeam } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (ownedTeam) return ownedTeam;
      // Otherwise check if user is a player in a team
      const { data: playerRecord } = await supabase
        .from("players")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!playerRecord) return null;
      const { data: playerTeam } = await supabase
        .from("teams")
        .select("*")
        .eq("id", playerRecord.team_id)
        .maybeSingle();
      return playerTeam;
    },
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (team: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const payload = { ...team, owner_id: user.id } as any;
      const { data, error } = await supabase
        .from("teams")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      toast({ title: "Time criado! ⚽" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("teams")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      toast({ title: "Time atualizado! ✅" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      toast({ title: "Time excluído" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useUploadTeamLogo = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ teamId, file }: { teamId: string; file: File }) => {
      const ext = file.name.split(".").pop();
      const path = `${teamId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("team-logos").getPublicUrl(path);
      const { error } = await supabase
        .from("teams")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", teamId);
      if (error) throw error;
      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      toast({ title: "Escudo atualizado! 🛡️" });
    },
    onError: (error) => {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    },
  });
};

// ==================== PLAYERS ====================
export const usePlayers = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ["players", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("jersey_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
};

export const useCreatePlayer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (player: { team_id: string; name: string; position?: string; jersey_number?: number }) => {
      const { data, error } = await supabase
        .from("players")
        .insert(player)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["players", data.team_id] });
      toast({ title: "Jogador adicionado! ⚽" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdatePlayer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; position?: string; jersey_number?: number; team_id: string }) => {
      const { data, error } = await supabase
        .from("players")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["players", data.team_id] });
      toast({ title: "Jogador atualizado! ✅" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeletePlayer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: ["players", teamId] });
      toast({ title: "Jogador removido" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

// ==================== MATCHES ====================
export const useMatches = () => {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, abbreviation, owner_id),
          away_team:teams!matches_away_team_id_fkey(id, name, abbreviation, owner_id)
        `)
        .order("match_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (match: { home_team_id: string; location: string; match_date: string; format: string }) => {
      const { data, error } = await supabase
        .from("matches")
        .insert(match)
        .select()
        .single();
      if (error) throw error;

      // Auto-summon all team players
      const { data: teamPlayers } = await supabase
        .from("players")
        .select("id, position")
        .eq("team_id", match.home_team_id);

      if (teamPlayers && teamPlayers.length > 0) {
        const summons = teamPlayers.map((p) => ({
          match_id: data.id,
          player_id: p.id,
          position: p.position,
          status: "pending",
        }));
        await supabase.from("match_summons").insert(summons);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match-summons", data.id] });
      queryClient.invalidateQueries({ queryKey: ["my-summons"] });
      toast({ title: "Partida criada e jogadores convocados! 🏟️📣" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useAcceptMatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, awayTeamId }: { matchId: string; awayTeamId: string }) => {
      const { data, error } = await supabase
        .from("matches")
        .update({ away_team_id: awayTeamId, status: "confirmed" })
        .eq("id", matchId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Desafio aceito! 🤝" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("matches")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Partida atualizada! ✅" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteMatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Partida excluída" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

// ==================== LINEUPS ====================
export const useMatchLineups = (matchId: string | undefined) => {
  return useQuery({
    queryKey: ["match-lineups", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_lineups")
        .select("*, player:players(*)")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });
};

export const useCreateLineup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lineup: { match_id: string; player_id: string; position?: string }) => {
      const { data, error } = await supabase
        .from("match_lineups")
        .insert(lineup)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-lineups", data.match_id] });
      toast({ title: "Jogador escalado! ⚽" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteLineup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, matchId }: { id: string; matchId: string }) => {
      const { error } = await supabase.from("match_lineups").delete().eq("id", id);
      if (error) throw error;
      return matchId;
    },
    onSuccess: (matchId) => {
      queryClient.invalidateQueries({ queryKey: ["match-lineups", matchId] });
    },
  });
};

// ==================== SUMMONS ====================
export const useMatchSummons = (matchId: string | undefined) => {
  return useQuery({
    queryKey: ["match-summons", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_summons")
        .select("*, player:players(*)")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });
};

export const useMySummons = () => {
  return useQuery({
    queryKey: ["my-summons"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      // Find player records for this user
      const { data: playerRecords } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id);
      if (!playerRecords?.length) return [];
      const playerIds = playerRecords.map((p) => p.id);
      const { data, error } = await supabase
        .from("match_summons")
        .select("*, player:players(*), match:matches(*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name))")
        .in("player_id", playerIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateSummons = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (summons: { match_id: string; player_id: string; position?: string }[]) => {
      const { data, error } = await supabase
        .from("match_summons")
        .insert(summons)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.[0]) {
        queryClient.invalidateQueries({ queryKey: ["match-summons", data[0].match_id] });
      }
      toast({ title: "Convocação enviada! 📣" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};

export const useRespondSummon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "declined" }) => {
      const { data, error } = await supabase
        .from("match_summons")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Auto-add to lineup when confirmed
      if (status === "confirmed" && data) {
        // Check if already in lineup
        const { data: existing } = await supabase
          .from("match_lineups")
          .select("id")
          .eq("match_id", data.match_id)
          .eq("player_id", data.player_id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("match_lineups").insert({
            match_id: data.match_id,
            player_id: data.player_id,
            position: data.position,
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-summons", data.match_id] });
      queryClient.invalidateQueries({ queryKey: ["match-lineups", data.match_id] });
      queryClient.invalidateQueries({ queryKey: ["my-summons"] });
      toast({ title: data.status === "confirmed" ? "Presença confirmada! ✅" : "Participação recusada" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};
