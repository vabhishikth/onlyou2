import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const TOKEN_KEY = "onlyou.session.token";

interface AuthState {
  token: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  hydrated: false,

  async hydrate() {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token, hydrated: true });
  },

  async setToken(token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token });
  },

  async clearToken() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null });
  },
}));
