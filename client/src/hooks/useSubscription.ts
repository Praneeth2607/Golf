import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SubscriptionStatus {
  id: string;
  status: string;
  plan: string;
  amountPaise: number;
  currentPeriodEnd: string | null;
  charityId: string | null;
  charityPercentage: string;
  charity: { id: string; name: string; slug: string } | null;
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () =>
      (await api.get<{ subscription: SubscriptionStatus | null }>("/subscriptions/status")).data.subscription,
  });
}

export interface Contribution {
  id: string;
  amountPaise: number;
  percentage: string;
  periodStart: string;
  charity: { name: string };
}

export function useContributions() {
  return useQuery({
    queryKey: ["contributions"],
    queryFn: async () =>
      (await api.get<{ contributions: Contribution[]; totalPaise: number }>("/subscriptions/contributions")).data,
  });
}
