import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type VerificationStatus = "AWAITING_PROOF" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type PayoutStatus = "PENDING" | "PAID";

export interface WinnerRecord {
  id: string;
  matchTier: "FIVE" | "FOUR" | "THREE";
  prizeAmountPaise: number;
  createdAt: string;
  draw: { id: string; periodLabel: string; publishedAt: string };
  verification: { status: VerificationStatus; proofFilePath: string | null; reviewNotes: string | null } | null;
  payout: { status: PayoutStatus } | null;
}

export function useMyWinnings() {
  return useQuery({
    queryKey: ["winnings-mine"],
    queryFn: async () =>
      (await api.get<{ winners: WinnerRecord[]; totalWonPaise: number; totalPaidPaise: number }>("/winners")).data,
  });
}

export function useUploadProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ winnerId, file }: { winnerId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      // No explicit Content-Type — the browser sets multipart/form-data with
      // the correct boundary itself; overriding it here would break the upload.
      return (await api.post(`/winners/${winnerId}/proof`, form)).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["winnings-mine"] }),
  });
}

export function useProofUrl(winnerId: string | null, admin = false) {
  return useQuery({
    queryKey: ["proof-url", winnerId, admin],
    queryFn: async () =>
      (await api.get<{ url: string }>(`${admin ? "/admin" : ""}/winners/${winnerId}/proof`)).data.url,
    enabled: !!winnerId,
  });
}
