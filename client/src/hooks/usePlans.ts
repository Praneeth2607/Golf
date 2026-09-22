import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PlanDetails {
  plan: "MONTHLY" | "YEARLY";
  providerPlanId: string;
  amountPaise: number;
  currency: string;
  interval: string;
}

export function usePlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await api.get<{ provider: string; plans: PlanDetails[] }>("/subscriptions/plans");
      return res.data;
    },
  });
}
