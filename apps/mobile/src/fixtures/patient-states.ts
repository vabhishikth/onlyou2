/** All possible patient journey states used by dev scenario tooling. */
export type PatientState = "new" | "reviewing" | "ready" | "active";

export type Gender = "male" | "female" | "other";

export type Vertical = "hair-loss" | "ed" | "pe" | "weight" | "pcos";

export type ConsultationStatus =
  | "submitted"
  | "under-review"
  | "plan-ready"
  | "paid"
  | "active";

export type OrderStatus =
  | "preparing"
  | "dispatched"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export interface Consultation {
  id: string;
  vertical: Vertical;
  status: ConsultationStatus;
  submittedAt: number;
  doctorName?: string;
  doctorSpecialty?: string;
  diagnosis?: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  vertical: Vertical;
  items: Array<{ name: string; dosage: string; schedule: string }>;
  issuedAt: number;
  doctorName: string;
  pdfUrl?: string;
}

export interface Order {
  id: string;
  prescriptionId: string;
  vertical: Vertical;
  status: OrderStatus;
  itemCount: number;
  totalPaise: number;
  placedAt: number;
  expectedDelivery?: number;
}

export interface Delivery {
  orderId: string;
  status: OrderStatus;
  progress: Array<{ label: string; at: number; done: boolean }>;
}

export interface Message {
  id: string;
  conversationId: string;
  fromPatient: boolean;
  text: string;
  sentAt: number;
}

export interface Conversation {
  id: string;
  vertical: Vertical;
  doctorName: string;
  doctorSpecialty: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: number;
  messages: Message[];
}

export interface Subscription {
  id: string;
  vertical: Vertical;
  plan: "monthly" | "quarterly" | "six-month";
  priceMonthlyPaise: number;
  nextBillingAt?: number;
  startedAt: number;
}

export interface FixtureUser {
  userId: string;
  phone: string;
  name: string;
  gender: Gender;
  age: number;
  state: PatientState;
  consultations: Consultation[];
  prescriptions: Prescription[];
  orders: Order[];
  deliveries: Delivery[];
  conversations: Conversation[];
  subscriptions: Subscription[];
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();

const arjun: FixtureUser = {
  userId: "user_arjun_001",
  phone: "+91 99999 00001",
  name: "Arjun Sharma",
  gender: "male",
  age: 28,
  state: "new",
  consultations: [],
  prescriptions: [],
  orders: [],
  deliveries: [],
  conversations: [],
  subscriptions: [],
};

const priya: FixtureUser = {
  userId: "user_priya_002",
  phone: "+91 99999 00002",
  name: "Priya Iyer",
  gender: "female",
  age: 32,
  state: "reviewing",
  consultations: [
    {
      id: "c-priya-1",
      vertical: "pcos",
      status: "under-review",
      submittedAt: now - 4 * HOUR,
    },
  ],
  prescriptions: [],
  orders: [],
  deliveries: [],
  conversations: [
    {
      id: "conv-priya-1",
      vertical: "pcos",
      doctorName: "Dr. Neha Kapoor",
      doctorSpecialty: "Endocrinologist",
      unreadCount: 0,
      lastMessagePreview:
        "Your doctor will respond once your case is reviewed.",
      lastMessageAt: now - 4 * HOUR,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-priya-1",
          fromPatient: false,
          text: "Your doctor will respond once your case is reviewed.",
          sentAt: now - 4 * HOUR,
        },
      ],
    },
  ],
  subscriptions: [],
};

const rahul: FixtureUser = {
  userId: "user_rahul_003",
  phone: "+91 99999 00003",
  name: "Rahul Mehta",
  gender: "male",
  age: 35,
  state: "ready",
  consultations: [
    {
      id: "c-rahul-1",
      vertical: "hair-loss",
      status: "plan-ready",
      submittedAt: now - 2 * DAY,
      doctorName: "Dr. Priya Sharma",
      doctorSpecialty: "Dermatologist",
      diagnosis: "Male pattern hair loss (Norwood Type III) — Moderate",
    },
  ],
  prescriptions: [
    {
      id: "rx-rahul-1",
      consultationId: "c-rahul-1",
      vertical: "hair-loss",
      items: [
        {
          name: "Finasteride 1mg",
          dosage: "1 tablet",
          schedule: "Once daily after breakfast",
        },
        {
          name: "Minoxidil 5%",
          dosage: "1 ml",
          schedule: "Apply to scalp at bedtime",
        },
        {
          name: "Biotin 10,000mcg",
          dosage: "1 capsule",
          schedule: "Once daily",
        },
      ],
      issuedAt: now - 2 * HOUR,
      doctorName: "Dr. Priya Sharma",
    },
  ],
  orders: [],
  deliveries: [],
  conversations: [
    {
      id: "conv-rahul-1",
      vertical: "hair-loss",
      doctorName: "Dr. Priya Sharma",
      doctorSpecialty: "Dermatologist",
      unreadCount: 1,
      lastMessagePreview: "Your treatment plan is ready. Tap to review.",
      lastMessageAt: now - 2 * HOUR,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-rahul-1",
          fromPatient: false,
          text: "Based on your assessment I recommend Finasteride + Minoxidil. Your plan is ready to view.",
          sentAt: now - 2 * HOUR,
        },
      ],
    },
  ],
  subscriptions: [],
};

const sanjana: FixtureUser = {
  userId: "user_sanjana_004",
  phone: "+91 99999 00004",
  name: "Sanjana Rao",
  gender: "female",
  age: 30,
  state: "active",
  consultations: [
    {
      id: "c-sanjana-1",
      vertical: "pcos",
      status: "active",
      submittedAt: now - 14 * DAY,
      doctorName: "Dr. Neha Kapoor",
      doctorSpecialty: "Endocrinologist",
      diagnosis: "PCOS — irregular cycle, mild insulin resistance",
    },
  ],
  prescriptions: [
    {
      id: "rx-sanjana-1",
      consultationId: "c-sanjana-1",
      vertical: "pcos",
      items: [
        {
          name: "Metformin 500mg",
          dosage: "1 tablet",
          schedule: "Twice daily with meals",
        },
        {
          name: "Inositol 2g",
          dosage: "1 scoop",
          schedule: "Once daily with water",
        },
      ],
      issuedAt: now - 12 * DAY,
      doctorName: "Dr. Neha Kapoor",
    },
  ],
  orders: [
    {
      id: "o-sanjana-1",
      prescriptionId: "rx-sanjana-1",
      vertical: "pcos",
      status: "out-for-delivery",
      itemCount: 2,
      totalPaise: 99900,
      placedAt: now - 12 * DAY,
      expectedDelivery: now + 4 * HOUR,
    },
  ],
  deliveries: [
    {
      orderId: "o-sanjana-1",
      status: "out-for-delivery",
      progress: [
        { label: "Preparing", at: now - 12 * DAY, done: true },
        { label: "Dispatched", at: now - 10 * DAY, done: true },
        { label: "Out for delivery", at: now - 2 * HOUR, done: true },
        { label: "Delivered", at: 0, done: false },
      ],
    },
  ],
  conversations: [
    {
      id: "conv-sanjana-1",
      vertical: "pcos",
      doctorName: "Dr. Neha Kapoor",
      doctorSpecialty: "Endocrinologist",
      unreadCount: 0,
      lastMessagePreview: "Day 14 going well — keep tracking your cycle.",
      lastMessageAt: now - DAY,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-sanjana-1",
          fromPatient: false,
          text: "Based on your labs, starting Metformin + Inositol for cycle regulation.",
          sentAt: now - 12 * DAY,
        },
        {
          id: "m-2",
          conversationId: "conv-sanjana-1",
          fromPatient: true,
          text: "Thank you doctor — how long until I see changes?",
          sentAt: now - 11 * DAY,
        },
        {
          id: "m-3",
          conversationId: "conv-sanjana-1",
          fromPatient: false,
          text: "Cycle regulation usually takes 3 months. Keep logging your cycle in the app.",
          sentAt: now - DAY,
        },
      ],
    },
  ],
  subscriptions: [
    {
      id: "s-sanjana-1",
      vertical: "pcos",
      plan: "quarterly",
      priceMonthlyPaise: 83300,
      nextBillingAt: now + 60 * DAY,
      startedAt: now - 12 * DAY,
    },
  ],
};

export const FIXTURES: Record<PatientState, FixtureUser> = {
  new: arjun,
  reviewing: priya,
  ready: rahul,
  active: sanjana,
};
