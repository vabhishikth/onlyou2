import { internalMutation } from "../_generated/server";

/**
 * Idempotent seeder — creates the 4 fake patient users (Arjun, Priya,
 * Rahul, Sanjana) if they don't already exist. Matches the scenario-
 * switcher phones from apps/mobile/src/fixtures/patient-states.ts.
 *
 * Run manually from the Convex dashboard against the dev deployment.
 * DO NOT run against production — the isFixture flag keeps these rows
 * out of any production query that filters by it.
 */
export const seedFakeUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = [
      {
        name: "Arjun Sharma",
        phone: "+91 99999 00001",
        gender: "male" as const,
        dob: "1993-06-12",
      },
      {
        name: "Priya Iyer",
        phone: "+91 99999 00002",
        gender: "female" as const,
        dob: "1996-02-24",
      },
      {
        name: "Rahul Mehta",
        phone: "+91 99999 00003",
        gender: "male" as const,
        dob: "1990-11-03",
      },
      {
        name: "Sanjana Rao",
        phone: "+91 99999 00004",
        gender: "female" as const,
        dob: "1997-09-18",
      },
    ];

    const created: string[] = [];
    const skipped: string[] = [];

    for (const u of users) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", u.phone))
        .unique();

      if (existing) {
        skipped.push(u.phone);
        continue;
      }

      await ctx.db.insert("users", {
        ...u,
        role: "PATIENT",
        pincode: "560001",
        city: "Bengaluru",
        state: "Karnataka",
        address: "Fixture address",
        phoneVerified: true,
        profileComplete: true,
        isFixture: true,
        createdAt: Date.now(),
      });
      created.push(u.phone);
    }

    return { created, skipped };
  },
});
