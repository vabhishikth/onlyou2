/** All possible patient journey states used by dev scenario tooling. */
export type PatientState = "new" | "reviewing" | "ready" | "active";

export type Gender = "male" | "female" | "other";

export interface FixtureUser {
  userId: string;
  phone: string;
  name: string;
  gender: Gender;
  age: number;
  state: PatientState;
  consultations: unknown[];
  prescriptions: unknown[];
  orders: unknown[];
  deliveries: unknown[];
  messages: unknown[];
  biomarkerReports: unknown[];
  subscriptions: unknown[];
}

export const FIXTURES: Record<PatientState, FixtureUser> = {
  new: {
    userId: "user_arjun_001",
    phone: "+919999900001",
    name: "Arjun Sharma",
    gender: "male",
    age: 28,
    state: "new",
    consultations: [],
    prescriptions: [],
    orders: [],
    deliveries: [],
    messages: [],
    biomarkerReports: [],
    subscriptions: [],
  },
  reviewing: {
    userId: "user_priya_002",
    phone: "+919999900002",
    name: "Priya Nair",
    gender: "female",
    age: 32,
    state: "reviewing",
    consultations: [],
    prescriptions: [],
    orders: [],
    deliveries: [],
    messages: [],
    biomarkerReports: [],
    subscriptions: [],
  },
  ready: {
    userId: "user_rahul_003",
    phone: "+919999900003",
    name: "Rahul Mehta",
    gender: "male",
    age: 35,
    state: "ready",
    consultations: [],
    prescriptions: [],
    orders: [],
    deliveries: [],
    messages: [],
    biomarkerReports: [],
    subscriptions: [],
  },
  active: {
    userId: "user_sanjana_004",
    phone: "+919999900004",
    name: "Sanjana Iyer",
    gender: "female",
    age: 30,
    state: "active",
    consultations: [],
    prescriptions: [],
    orders: [],
    deliveries: [],
    messages: [],
    biomarkerReports: [],
    subscriptions: [],
  },
};
