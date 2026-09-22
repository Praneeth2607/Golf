import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: "SUBSCRIBER" | "ADMIN";
  createdAt: string;
  latestSubscription: { status: string; plan: string } | null;
  scoreCount: number;
}

export function useAdminUsers(q: string) {
  return useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => (await api.get<{ users: AdminUserListItem[] }>("/admin/users", { params: { q: q || undefined } })).data.users,
  });
}

export interface AdminUserDetail {
  id: string;
  email: string;
  fullName: string | null;
  role: "SUBSCRIBER" | "ADMIN";
  createdAt: string;
  scores: { id: string; strokes: number; playedOn: string }[];
  totalCharityContributedPaise: number;
  totalDonatedPaise: number;
  totalWonPaise: number;
  winners: {
    id: string;
    matchTier: string;
    prizeAmountPaise: number;
    draw: { periodLabel: string };
    verification: { status: string } | null;
    payout: { status: string } | null;
  }[];
}

export function useAdminUserDetail(id: string | null) {
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => (await api.get<{ user: AdminUserDetail }>(`/admin/users/${id}`)).data.user,
    enabled: !!id,
  });
}

export function useInvalidateAdminUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user"] });
  };
}

export interface AdminSubscription {
  id: string;
  plan: string;
  status: string;
  amountPaise: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  user: { id: string; email: string; fullName: string | null };
  charity: { name: string } | null;
}

export function useAdminSubscriptions(params: { status?: string; q?: string; userId?: string }) {
  return useQuery({
    queryKey: ["admin-subscriptions", params],
    queryFn: async () =>
      (
        await api.get<{ subscriptions: AdminSubscription[] }>("/admin/subscriptions", {
          params: { status: params.status || undefined, q: params.q || undefined, userId: params.userId || undefined },
        })
      ).data.subscriptions,
  });
}

export interface AdminReports {
  totalUsers: number;
  subscribersByStatus: Record<string, number>;
  totalCharityContributedPaise: number;
  totalDonatedPaise: number;
  totalPrizePoolPaise: number;
  totalPaidOutPaise: number;
  totalPendingPayoutPaise: number;
  draws: { total: number; byStatus: Record<string, number> };
  winnersByTier: Record<string, number>;
  charityBreakdown: { charityId: string; name: string; totalPaise: number; contributionCount: number }[];
}

export function useAdminReports() {
  return useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => (await api.get<AdminReports>("/admin/reports")).data,
  });
}

export interface AdminTrends {
  subscriptionsByMonth: { month: string; count: number }[];
  drawHistory: {
    periodLabel: string;
    prizePoolPaise: number;
    eligibleSubscriberCount: number;
    winnerCount: number;
    jackpotRolledOver: boolean;
  }[];
  verificationFunnel: Record<"AWAITING_PROOF" | "SUBMITTED" | "APPROVED" | "REJECTED", number>;
  payouts: {
    pending: { count: number; amountPaise: number };
    paid: { count: number; amountPaise: number };
  };
}

export function useAdminTrends() {
  return useQuery({
    queryKey: ["admin-reports-trends"],
    queryFn: async () => (await api.get<AdminTrends>("/admin/reports/trends")).data,
  });
}
