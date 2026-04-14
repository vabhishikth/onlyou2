import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { useAuthStore } from "../stores/auth-store";

/**
 * Returns the currently-authenticated user from Convex, or undefined
 * while the query is loading, or null when signed out. This is the one
 * call that every screen uses to know "am I logged in, and who am I?"
 */
export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  return useQuery(api.auth.sessions.getCurrentUser, token ? { token } : "skip");
}
