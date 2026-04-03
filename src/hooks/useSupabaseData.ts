import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockDb } from "@/lib/mockDb";
import { useToast } from "@/hooks/use-toast";

// ==================== AUTH HOOK ====================
export const useAuth = () => {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => ({ id: "mock-user-id", email: "dev@mock.com" }),
  });
};

// ==================== PROFILE ====================
export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => mockDb.getProfile(),
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
    }) => mockDb.updateProfile(updates as Record<string, unknown>),
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
    mutationFn: async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          mockDb.updateProfile({ avatar_url: dataUrl });
          resolve(dataUrl);
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsDataURL(file);
      });
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
    queryFn: async () => mockDb.getTeam(),
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (team: Record<string, any>) => mockDb.createTeam(team),
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
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) =>
      mockDb.updateTeam(id, updates),
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
    mutationFn: async (_id: string) => mockDb.deleteTeam(),
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
    mutationFn: async ({ teamId, file }: { teamId: string; file: File }): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          mockDb.updateTeam(teamId, { logo_url: dataUrl });
          resolve(dataUrl);
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsDataURL(file);
      });
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
    queryFn: async () => (teamId ? mockDb.getPlayers(teamId) : []),
    enabled: !!teamId,
  });
};

export const useCreatePlayer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (player: { team_id: string; name: string; [key: string]: any }) =>
      mockDb.createPlayer(player),
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
    mutationFn: async ({ id, team_id, ...updates }: { id: string; team_id: string; [key: string]: any }) => {
      const updated = mockDb.updatePlayer(id, updates);
      return { ...updated, team_id };
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
      mockDb.deletePlayer(id);
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
    queryFn: async () => mockDb.getMatches(),
  });
};

export const useCreateMatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (match: { home_team_id: string; location: string; match_date: string; format: string }) =>
      mockDb.createMatch(match),
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
    mutationFn: async ({ matchId, awayTeamId }: { matchId: string; awayTeamId: string }) =>
      mockDb.updateMatch(matchId, { away_team_id: awayTeamId, status: "confirmed" }),
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
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) =>
      mockDb.updateMatch(id, updates),
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
    mutationFn: async (id: string) => mockDb.deleteMatch(id),
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
    queryFn: async () => (matchId ? mockDb.getLineups(matchId) : []),
    enabled: !!matchId,
  });
};

export const useCreateLineup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (lineup: { match_id: string; player_id: string; position?: string }) =>
      mockDb.createLineup(lineup),
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
      mockDb.deleteLineup(id);
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
    queryFn: async () => (matchId ? mockDb.getSummons(matchId) : []),
    enabled: !!matchId,
  });
};

export const useMySummons = () => {
  return useQuery({
    queryKey: ["my-summons"],
    queryFn: async () => mockDb.getMySummons(),
  });
};

export const useCreateSummons = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (summons: { match_id: string; player_id: string; position?: string }[]) =>
      mockDb.createSummons(summons as Record<string, unknown>[]),
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
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "declined" }) =>
      mockDb.respondSummon(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["match-summons", data.match_id] });
      queryClient.invalidateQueries({ queryKey: ["match-lineups", data.match_id] });
      queryClient.invalidateQueries({ queryKey: ["my-summons"] });
      toast({
        title: data.status === "confirmed" ? "Presença confirmada! ✅" : "Participação recusada",
      });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
};
