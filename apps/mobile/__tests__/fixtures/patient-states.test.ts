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
