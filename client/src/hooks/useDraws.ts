import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WinnerCounts {
  FIVE: number;
  FOUR: number;
  THREE: number;
}

export interface PublicDraw {
  id: string;
  periodLabel: string;
  method: "RANDOM" | "ALGORITHMIC";
  publishedAt: string;
  winningNumbers: number[];
  prizePoolPaise: number | null;
  tier5PoolPaise: number | null;
  tier4PoolPaise: number | null;
  tier3PoolPaise: number | null;
  jackpotRolloverOutPaise: number | null;
  eligibleSubscriberCount: number | null;
  winnerCounts: WinnerCounts;
}

export function usePublishedDraws() {
  return useQuery({
    queryKey: ["draws"],
    queryFn: async () => (await api.get<{ draws: PublicDraw[] }>("/draws")).data.draws,
  });
}

export interface Participation {
  drawId: string;
  periodLabel: string;
  publishedAt: string;
  yourNumbers: number[];
  winningNumbers: number[];
  won: { matchTier: "FIVE" | "FOUR" | "THREE"; prizeAmountPaise: number } | null;
}

export function useMyParticipation() {
  return useQuery({
    queryKey: ["draws-mine"],
    queryFn: async () => (await api.get<{ participation: Participation[] }>("/draws/mine")).data.participation,
  });
}
