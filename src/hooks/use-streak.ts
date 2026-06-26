import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export interface BadgeInfo {
  id: string;
  label: string;
  unlocked: boolean;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayActivityCount: number;
  badges: BadgeInfo[];
  newlyUnlocked: string[];
}

export function useStreak(userId: string | undefined) {
  return useQuery<StreakData>({
    queryKey: ["streak", userId],
    queryFn: () => apiRequest<StreakData>(`/api/users/${userId}/streak`),
    enabled: !!userId,
    staleTime: 60_000,
  });
}