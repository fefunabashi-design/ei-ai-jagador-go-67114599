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
    const sync = () => setData(mockDb.getTeam());
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("mock-db-change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mock-db-change", sync);
    };
  }, []);
  return { data, isLoading: false };
};

export const useMyTeams = () => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    const sync = () => setData(mockDb.getMyTeams());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("mock-db-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mock-db-change", sync);
    };
  }, []);
  return { data, isLoading: false };
};

export const useSetActiveTeam = () => {
  return (teamId: string) => {
    mockDb.setActiveTeam(teamId);
    emitMockDbChange();
  };
};

export const usePlayers = (teamId?: string) => {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    const sync = () => {
      if (teamId) {
        setData(mockDb.getPlayers(teamId));
        return;
      }

      setData([]);
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("mock-db-change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mock-db-change", sync);
    };
  }, [teamId]);
  return { data, isLoading: false };
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
  return { data, isLoading: false };
};

// ── Stubs para hooks não implementados no mockDb ─────────────────────────────
const emitMockDbChange = () => {
  window.dispatchEvent(new CustomEvent("mock-db-change"));
};

const noop = (..._args: any[]) => {};
const pendingMutation = {
  mutate: noop as (...args: any[]) => void,
  mutateAsync: (async (..._args: any[]) => {}) as (...args: any[]) => Promise<unknown>,
  isPending: false,
  isLoading: false,
};

export const useProfile        = ()           => ({ data: mockDb.getProfile(), isLoading: false });
export const useUpdateProfile  = ()           => pendingMutation;
export const useUploadAvatar   = ()           => pendingMutation;
export const useAuth           = ()           => ({ data: null, user: null, session: null });

export const useCreateMatch    = ()           => pendingMutation;
export const useUpdateMatch    = ()           => pendingMutation;
export const useDeleteMatch    = ()           => pendingMutation;
export const useAcceptMatch    = ()           => pendingMutation;

export const useCreateTeam = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (data: Record<string, unknown>) => {
    setIsPending(true);
    try {
      mockDb.createTeam(data);
      emitMockDbChange();
      toast({ title: "Time cadastrado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao cadastrar time", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useUpdateTeam = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (data: Record<string, unknown> & { id: string }) => {
    setIsPending(true);
    try {
      mockDb.updateTeam(data.id, data);
      emitMockDbChange();
      toast({ title: "Dados do time atualizados!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar time", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useDeleteTeam = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (_id: string) => {
    setIsPending(true);
    try {
      mockDb.deleteTeam();
      emitMockDbChange();
      toast({ title: "Time excluido com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir time", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useUploadTeamLogo = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async ({ teamId, file }: { teamId: string; file: File }) => {
    setIsPending(true);
    try {
      const logoUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      mockDb.updateTeam(teamId, { logo_url: logoUrl });
      emitMockDbChange();
      toast({ title: "Escudo atualizado!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar escudo", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useCreatePlayer = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (data: Record<string, unknown>) => {
    setIsPending(true);
    try {
      mockDb.createPlayer(data);
      emitMockDbChange();
      toast({ title: "Jogador adicionado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao adicionar jogador", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useUpdatePlayer = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (data: Record<string, unknown> & { id: string }) => {
    setIsPending(true);
    try {
      mockDb.updatePlayer(data.id, data);
      emitMockDbChange();
      toast({ title: "Jogador atualizado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar jogador", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useDeletePlayer = () => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const mutate = async ({ id }: { id: string; teamId: string }) => {
    setIsPending(true);
    try {
      mockDb.deletePlayer(id);
      emitMockDbChange();
      toast({ title: "Jogador removido com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao remover jogador", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, isLoading: isPending };
};

export const useMatchLineups   = (_id?: string) => ({ data: [] });
export const useCreateLineup   = ()           => pendingMutation;
export const useDeleteLineup   = ()           => pendingMutation;
export const useCreateSummons  = ()           => pendingMutation;

export const useMatches_       = useMatches; // alias
