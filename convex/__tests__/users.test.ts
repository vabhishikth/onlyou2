/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

/**
 * Build an ISO `YYYY-MM-DD` string that is exactly `years` ago from
 * `reference`, optionally shifted by `offsetDays`. Uses UTC components so
 * the result is independent of the host timezone.
 */
function isoYearsAgo(
  reference: Date,
  years: number,
  offsetDays: number = 0,
): string {
  const d = new Date(
    Date.UTC(
      reference.getUTCFullYear() - years,
      reference.getUTCMonth(),
      reference.getUTCDate() + offsetDays,
    ),
  );
  return d.toISOString().slice(0, 10);
}

async function signIn(t: ReturnType<typeof convexTest>, phone: string) {
  await t.action(api.auth.otp.sendOtp, { phone });
  return t.action(api.auth.otp.verifyOtp, { phone, otp: "000000" });
}

describe("users.completeProfile — 18+ enforcement", () => {
  it("rejects a DOB that is 17 years ago today", async () => {
    const t = convexTest(schema, modules);
    const { token } = await signIn(t, "+919999900020");
    const dob = isoYearsAgo(new Date(), 17);

    await expect(
      t.mutation(api.users.completeProfile, {
        token,
        name: "Aarav",
        dob,
        gender: "male",
        pincode: "110001",
        city: "Delhi",
        state: "Delhi",
        address: "1 Example Lane",
      }),
    ).rejects.toThrow(/18 or older/);
  });

  it("accepts a DOB that is exactly 18 years ago today", async () => {
    const t = convexTest(schema, modules);
    const { token, userId } = await signIn(t, "+919999900021");
    const dob = isoYearsAgo(new Date(), 18);

    await t.mutation(api.users.completeProfile, {
      token,
      name: "Aarav",
      dob,
      gender: "male",
      pincode: "110001",
      city: "Delhi",
      state: "Delhi",
      address: "1 Example Lane",
    });

    const user = await t.run((ctx) => ctx.db.get(userId as Id<"users">));
    if (!user || !("profileComplete" in user)) {
      throw new Error("expected user document");
    }
    expect(user.profileComplete).toBe(true);
    expect(user.dob).toBe(dob);
  });

  it("rejects a malformed DOB string", async () => {
    const t = convexTest(schema, modules);
    const { token } = await signIn(t, "+919999900022");

    await expect(
      t.mutation(api.users.completeProfile, {
        token,
        name: "Aarav",
        dob: "not-a-date",
        gender: "male",
        pincode: "110001",
        city: "Delhi",
        state: "Delhi",
        address: "1 Example Lane",
      }),
    ).rejects.toThrow(/valid date of birth/);
  });
});
