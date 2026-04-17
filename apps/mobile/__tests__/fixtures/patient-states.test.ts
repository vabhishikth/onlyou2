import { FIXTURES, type PatientState } from "@/fixtures/patient-states";

describe("patient-states fixtures", () => {
  const states: PatientState[] = ["new", "reviewing", "ready", "active"];

  it.each(states)('has a fixture for "%s"', (state) => {
    expect(FIXTURES[state]).toBeDefined();
    expect(FIXTURES[state].state).toBe(state);
  });

  it("covers both genders across the four scenarios", () => {
    const genders = states.map((s) => FIXTURES[s].gender);
    expect(genders).toContain("male");
    expect(genders).toContain("female");
  });

  it("seeds the expected phone numbers", () => {
    expect(FIXTURES.new.phone).toBe("+91 99999 00001");
    expect(FIXTURES.reviewing.phone).toBe("+91 99999 00002");
    expect(FIXTURES.ready.phone).toBe("+91 99999 00003");
    expect(FIXTURES.active.phone).toBe("+91 99999 00004");
  });

  it("gives every fixture user a name and age", () => {
    for (const state of states) {
      const user = FIXTURES[state];
      expect(user.name.length).toBeGreaterThan(0);
      expect(user.age).toBeGreaterThan(0);
    }
  });
});

describe("FixtureUser state-appropriate slices", () => {
  it("new user has no consultations", () => {
    expect(FIXTURES.new.consultations).toHaveLength(0);
  });

  it("reviewing user has one under-review consultation", () => {
    expect(FIXTURES.reviewing.consultations).toHaveLength(1);
    expect(FIXTURES.reviewing.consultations[0]?.status).toBe("under-review");
  });

  it("ready user has a plan-ready consultation + matching prescription", () => {
    expect(FIXTURES.ready.consultations[0]?.status).toBe("plan-ready");
    expect(FIXTURES.ready.prescriptions).toHaveLength(1);
    expect(FIXTURES.ready.prescriptions[0]?.items).toHaveLength(3);
  });

  it("active user has subscription + order + delivery + messages", () => {
    expect(FIXTURES.active.subscriptions).toHaveLength(1);
    expect(FIXTURES.active.orders).toHaveLength(1);
    expect(FIXTURES.active.deliveries).toHaveLength(1);
    expect(FIXTURES.active.conversations[0]?.messages.length).toBeGreaterThan(
      1,
    );
  });
});
