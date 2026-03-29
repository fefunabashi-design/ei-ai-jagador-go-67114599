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
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
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
        .update(updates)
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Partida criada! 🏟️" });
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
