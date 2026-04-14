import type { Question } from "./index";

export const hairLossQuestions: Question[] = [
  {
    id: "gender",
    type: "single",
    title: "How do you identify?",
    helper: "Some treatments are gender-specific.",
    options: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other / prefer not to say" },
    ],
    required: true,
  },
  {
    id: "duration",
    type: "single",
    title: "How long has your hair been thinning?",
    options: [
      { value: "lt-6", label: "Less than 6 months" },
      { value: "6-12", label: "6–12 months" },
      { value: "1-3", label: "1–3 years" },
      { value: "3+", label: "More than 3 years" },
    ],
    required: true,
  },
  {
    id: "areas",
    type: "multi",
    title: "Where are you noticing the most thinning?",
    helper: "Select all that apply.",
    options: [
      { value: "temples", label: "Temples / receding hairline" },
      { value: "crown", label: "Crown" },
      { value: "top", label: "Top of scalp" },
      { value: "all-over", label: "All over" },
    ],
    required: true,
  },
  {
    id: "photos",
    type: "photo",
    title: "Upload 4 photos of your scalp",
    helper: "Top of head · Hairline · Crown · Problem areas",
    required: true,
  },
];
