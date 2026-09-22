import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CharityEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  location: string | null;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  websiteUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  events?: CharityEvent[];
}

export function useCharities(params: { q?: string; featured?: boolean } = {}) {
  return useQuery({
    queryKey: ["charities", params],
    queryFn: async () => {
      const res = await api.get<{ charities: Charity[] }>("/charities", {
        params: { q: params.q || undefined, featured: params.featured || undefined },
      });
      return res.data.charities;
    },
  });
}

export function useCharity(slug: string | undefined) {
  return useQuery({
    queryKey: ["charity", slug],
    queryFn: async () => {
      const res = await api.get<{ charity: Charity }>(`/charities/${slug}`);
      return res.data.charity;
    },
    enabled: !!slug,
  });
}
