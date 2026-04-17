import type { Question } from "./index";

export const edQuestions: Question[] = [
  {
    id: "age-gate",
    type: "single",
    title: "Are you 18 or older?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    required: true,
  },
  {
    id: "iief-1",
    type: "single",
    title: "How often were you able to maintain an erection?",
    helper: "Over the last 4 weeks.",
    options: [
      { value: "always", label: "Almost always or always" },
      { value: "most", label: "Most times" },
      { value: "sometimes", label: "Sometimes" },
      { value: "rarely", label: "A few times or never" },
    ],
    required: true,
  },
  {
    id: "medications",
    type: "text",
    title: "Any medications you currently take?",
    helper: "Include dosage if you remember.",
    required: false,
  },
  {
    id: "health",
    type: "multi",
    title: "Do any of these apply to you?",
    options: [
      { value: "diabetes", label: "Diabetes" },
      { value: "hbp", label: "High blood pressure" },
      { value: "heart", label: "Heart condition" },
      { value: "none", label: "None of the above" },
    ],
    required: true,
  },
];
