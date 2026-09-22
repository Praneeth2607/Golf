import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Score {
  id: string;
  strokes: number;
  playedOn: string;
  createdAt: string;
  updatedAt: string;
}

export function useScores() {
  return useQuery({
    queryKey: ["scores"],
    queryFn: async () => (await api.get<{ scores: Score[] }>("/scores")).data.scores,
  });
}

export function useAddScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { strokes: number; playedOn: string }) =>
      (await api.post<{ scores: Score[] }>("/scores", input)).data.scores,
    onSuccess: (scores) => queryClient.setQueryData(["scores"], scores),
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; strokes?: number; playedOn?: string }) =>
      (await api.put<{ score: Score }>(`/scores/${id}`, input)).data.score,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scores"] }),
  });
}

export function useDeleteScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/scores/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scores"] }),
  });
}
