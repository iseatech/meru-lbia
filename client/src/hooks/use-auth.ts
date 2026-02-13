import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

type AuthUser = User & {
  role: string;
  twoFaEnabled: boolean;
  twoFaVerified: boolean;
};

type MeResponse = {
  user: User | null;
  role: string;
  twoFaEnabled: boolean;
  twoFaVerified: boolean;
};

async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const data: MeResponse = await response.json();
  if (!data.user) return null;

  return {
    ...data.user,
    role: data.role,
    twoFaEnabled: data.twoFaEnabled,
    twoFaVerified: data.twoFaVerified,
  };
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    twoFaEnabled: user?.twoFaEnabled ?? false,
    twoFaVerified: user?.twoFaVerified ?? false,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
  };
}
