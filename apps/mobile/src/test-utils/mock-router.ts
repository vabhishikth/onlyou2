import { jest } from "@jest/globals";

/**
 * Returns a mocked `router.push` function and installs a jest mock on
 * `expo-router`'s `router` export. Use in tests that exercise navigation.
 *
 * Variable names are prefixed with `mock` so Jest's hoisting guard allows
 * them to be referenced inside the `jest.mock()` factory.
 */
export function mockRouter() {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockBack = jest.fn();

  jest.mock("expo-router", () => ({
    router: { push: mockPush, replace: mockReplace, back: mockBack },
    useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
    Stack: ({ children }: { children: React.ReactNode }) => children,
    Tabs: ({ children }: { children: React.ReactNode }) => children,
    Link: ({ children }: { children: React.ReactNode }) => children,
  }));

  return mockPush;
}
