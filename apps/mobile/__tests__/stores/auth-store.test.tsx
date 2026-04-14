import * as SecureStore from "expo-secure-store";

import { useAuthStore } from "@/stores/auth-store";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, hydrated: false });
    jest.clearAllMocks();
  });

  it("hydrate reads the token from secure store", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("t-123");
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().token).toBe("t-123");
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it("setToken writes to secure store and state", async () => {
    await useAuthStore.getState().setToken("t-456");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "onlyou.session.token",
      "t-456",
    );
    expect(useAuthStore.getState().token).toBe("t-456");
  });

  it("clearToken deletes and nulls state", async () => {
    useAuthStore.setState({ token: "t-789", hydrated: true });
    await useAuthStore.getState().clearToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "onlyou.session.token",
    );
    expect(useAuthStore.getState().token).toBeNull();
  });
});
