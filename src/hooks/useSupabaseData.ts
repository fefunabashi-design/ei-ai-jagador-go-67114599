// This is a new file, assuming it would be created or modified to include this hook.
// In a real application, you would replace the mock logic with actual Supabase calls.
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast"; // Assuming useToast is available
import { mockDb } from "@/lib/mockDb";

// Define the type for a lineup entry to be saved
type LineupEntry = {
  match_id: string;
  player_id: string;
  slot_key?: string; // For field players
  role: 'starter' | 'reserve' | 'substitute';
};

export const useSaveLineup = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (lineupData: LineupEntry[]) => {
    setIsPending(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      // Persistir no banco de dados simulado (mockDb)
      lineupData.forEach(entry => mockDb.createLineup(entry));

      toast({ title: "Escalação salva com sucesso! ✅" });
    } catch (error: any) {
      console.error("Failed to save lineup:", error);
      toast({ title: "Erro ao salvar escalação", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
};

export const useMyTeam = () => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    setData(mockDb.getTeam());
  }, []);
  return { data };
};

export const usePlayers = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (teamId) {
      setData(mockDb.getPlayers(teamId));
    }
  }, [teamId]);
  return { data };
};

export const useMatches = () => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    setData(mockDb.getMatches());
  }, []);
  return { data };
};

export const usePhotoEvents = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!teamId) {
      setData([]);
      return;
    }
    setData(mockDb.getPhotoEvents(teamId));
  }, [teamId]);

  return { data };
};

export const usePhotoPosts = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!teamId) {
      setData([]);
      return;
    }
    setData(mockDb.getPhotoPosts(teamId));
  }, [teamId]);

  return { data };
};

export const useCreatePhotoPost = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = async (payload: {
    team_id: string;
    event_id: string;
    event_type: "partida" | "vaquinha";
    event_title: string;
    match_id?: string;
    photo_url: string;
    comment?: string;
  }) => {
    setIsPending(true);
    try {
      const result = mockDb.createPhotoPost(payload);
      toast({ title: "Foto publicada com sucesso! 📸" });
      return result;
    } catch (error: any) {
      toast({
        title: "Erro ao publicar foto",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (payload: Parameters<typeof mutateAsync>[0]) => {
      void mutateAsync(payload);
    },
    mutateAsync,
    isPending,
    isLoading: isPending,
  };
};

export const useMatchSummons = (matchId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (matchId) {
      setData(mockDb.getSummons(matchId));
    }
  }, [matchId]);
  return { data };
};

// ── Stubs para hooks não implementados no mockDb ─────────────────────────────
const noop = () => {};
const pendingMutation = { mutate: noop, mutateAsync: async () => {}, isPending: false, isLoading: false };

export const useProfile        = ()           => ({ data: null });
export const useUpdateProfile  = ()           => pendingMutation;
export const useUploadAvatar   = ()           => pendingMutation;
export const useAuth           = ()           => ({ user: null, session: null });

export const useCreateMatch    = ()           => pendingMutation;
export const useUpdateMatch    = ()           => pendingMutation;
export const useDeleteMatch    = ()           => pendingMutation;
export const useAcceptMatch    = ()           => pendingMutation;

export const useCreateTeam     = ()           => pendingMutation;
export const useUpdateTeam     = ()           => pendingMutation;
export const useDeleteTeam     = ()           => pendingMutation;
export const useUploadTeamLogo = ()           => pendingMutation;

export const useCreatePlayer   = ()           => pendingMutation;
export const useUpdatePlayer   = ()           => pendingMutation;
export const useDeletePlayer   = ()           => pendingMutation;

export const useMatchLineups   = (_id?: string) => ({ data: [] });
export const useCreateLineup   = ()           => pendingMutation;
export const useDeleteLineup   = ()           => pendingMutation;
export const useCreateSummons  = ()           => pendingMutation;

export const useMatches_       = useMatches; // alias