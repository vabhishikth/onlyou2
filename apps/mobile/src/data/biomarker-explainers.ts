/**
 * biomarker-explainers.ts
 *
 * Maps biomarker id → status-aware plain-language lifestyle explainer.
 * Phase 2.5E/W4 (Task 15): expanded from flat Record<string, string> into a
 * structured { base, byStatus } shape so Detail can compose a primer plus a
 * status-specific lifestyle lever for each of the four classification bands.
 *
 * Tone: "warm clinical luxe" — confident, non-alarming, India-aware when
 * natural. Keys match the mock dataset (biomarker-mock.ts) which drives the
 * demo path; real Convex data currently uses doc IDs for `b.id` and will hit
 * the fallback until canonical-id threading lands in a later phase.
 *
 * Usage:
 *   import { explainerFor } from '@/data/biomarker-explainers';
 *   const text = explainerFor(b.id, b.name, b.status);
 */

import { type BiomarkerStatus } from "../components/biomarker/status-helpers";

export type Explainer = {
  base: string;
  byStatus: {
    optimal: string;
    watch: string;
    high: string;
    low: string;
  };
};

export const EXPLAINER_MAP: Record<string, Explainer> = {
  // --- Lipids ---
  ldl: {
    base: "LDL cholesterol is the particle that carries cholesterol into artery walls, where it can contribute to plaque buildup over time.",
    byStatus: {
      optimal:
        "Your LDL is in a protective band. Maintain current habits — Mediterranean-style eating, regular movement, good sleep.",
      watch:
        "Slightly elevated. Prioritize soluble fibre (oats, apples, lentils), olive oil over butter, and retest in 90 days.",
      high: "Elevated enough to warrant action. Diet and movement changes help most; your care team may also discuss medication if lifestyle alone is insufficient.",
      low: "Unusually low. Rarely a concern on its own — your care team will review alongside other lipid markers.",
    },
  },
  hdl: {
    base: "HDL cholesterol is the 'good' cholesterol that helps clear excess cholesterol from circulation back to the liver.",
    byStatus: {
      optimal:
        "Your HDL is in the protective band. Keep up resistance training, Omega-3-rich foods, and avoid smoking.",
      watch:
        "Edging toward protective. Continue resistance training and add Omega-3 foods — fatty fish, flaxseed, walnuts — to nudge it up.",
      high: "Unusually high. Most often benign, but your care team will review in context of other lipid markers.",
      low: "Below protective range. Add resistance training, Omega-3-rich foods, and moderate olive oil; reduce refined carbs.",
    },
  },
  trig: {
    base: "Triglycerides are the main fat circulating in your blood — they rise with refined carbs, sugar, and alcohol.",
    byStatus: {
      optimal:
        "In a healthy band. Continue balanced meals, regular movement, and modest alcohol intake.",
      watch:
        "Trending up. Cut added sugar, refined grains, and sweetened drinks; prioritize fibre and fatty fish twice a week.",
      high: "Elevated and worth acting on. Reduce refined carbs and alcohol, add regular cardio, and your care team may discuss Omega-3 therapy.",
      low: "Low triglycerides are rarely a concern on their own — your care team will review alongside other lipid markers.",
    },
  },
  apob: {
    base: "ApoB counts the total number of atherogenic particles in your blood and is often a better predictor of cardiovascular risk than LDL alone.",
    byStatus: {
      optimal:
        "Your ApoB is in a protective band — a strong signal of low cardiovascular particle burden. Keep current habits.",
      watch:
        "Borderline. Worth watching alongside LDL-C; emphasize soluble fibre, olive oil, and 150 min of movement weekly.",
      high: "Elevated particle count. Diet and exercise are the first levers; your care team may discuss medication if targets aren't met.",
      low: "Unusually low. Typically reassuring — your care team will review with the rest of your lipid panel.",
    },
  },
  tc: {
    base: "Total cholesterol is the sum of all cholesterol particles in your blood; it's a starting point, but HDL, LDL, and ApoB tell the fuller story.",
    byStatus: {
      optimal:
        "In a healthy band. Continue Mediterranean-style eating and regular movement.",
      watch:
        "Slightly above optimal. Pull back on saturated fat, add soluble fibre, and revisit in 90 days.",
      high: "Elevated. Pair diet changes with cardio; your care team will interpret alongside LDL and ApoB before discussing medication.",
      low: "Unusually low — rarely a concern on its own. Your care team will review in context of nutrition and liver markers.",
    },
  },

  // --- Metabolic ---
  glucose: {
    base: "Fasting glucose reflects your body's ability to regulate blood sugar after an overnight fast — a core metabolic health signal.",
    byStatus: {
      optimal:
        "Comfortably in range. Keep balanced meals, consistent sleep, and daily movement.",
      watch:
        "Trending toward pre-diabetic range. Walk 10 minutes after meals, reduce refined carbs, and prioritize protein and fibre at breakfast.",
      high: "Elevated — worth acting on now. Post-meal walks, weight training, and cutting sweetened drinks are the fastest levers.",
      low: "Low fasting glucose can reflect fasting duration or medication; your care team will review alongside HbA1c and insulin.",
    },
  },
  hba1c: {
    base: "HbA1c estimates your average blood sugar over the past 2–3 months — a slower, more reliable metabolic marker than a single fasting value.",
    byStatus: {
      optimal:
        "In a healthy band. Continue balanced meals, movement after meals, and consistent sleep.",
      watch:
        "Creeping into pre-diabetic range. Add strength training twice weekly, prioritize protein and fibre, and reduce refined carbs.",
      high: "In pre-diabetic or diabetic range. Lifestyle changes remain the most powerful lever; your care team may also discuss medication.",
      low: "Unusually low — rarely a concern on its own; your care team will review in context.",
    },
  },
  insulin: {
    base: "Fasting insulin shows how hard your pancreas is working to keep blood sugar stable — high values often precede elevated glucose by years.",
    byStatus: {
      optimal:
        "Insulin sensitivity looks strong. Keep movement, sleep, and balanced meals consistent.",
      watch:
        "Mild insulin resistance forming. Add resistance training, post-meal walks, and reduce late-night eating.",
      high: "Significant insulin resistance. Strength training, improved sleep, and reducing refined carbs are the highest-leverage levers.",
      low: "Low fasting insulin is typically reassuring in the absence of symptoms; your care team will review alongside glucose.",
    },
  },

  // --- Hormones ---
  testo: {
    base: "Testosterone supports energy, muscle mass, libido, mood, and bone density in men, with smaller but real roles in women.",
    byStatus: {
      optimal:
        "In a healthy band. Strength training, good sleep, and sufficient protein keep it there.",
      watch:
        "Edging below optimal. Prioritize 7+ hours of sleep, resistance training, and adequate zinc and Vitamin D.",
      high: "Above typical range. If unintended, your care team will review supplementation, medications, and related hormones.",
      low: "Low enough to affect energy and recovery. Sleep, strength training, and weight management help; your care team may also investigate root causes.",
    },
  },
  cortisol: {
    base: "Morning cortisol reflects your stress-response rhythm — it should peak shortly after waking and taper through the day.",
    byStatus: {
      optimal:
        "Healthy morning peak. Keep consistent sleep and wake times, morning light, and regular movement.",
      watch:
        "Slightly off-rhythm. Prioritize morning sunlight, reduce late caffeine, and build a wind-down routine.",
      high: "Elevated — often linked to chronic stress or disrupted sleep. Protect sleep, reduce late-evening stimulants, and add breathwork or walks.",
      low: "Low morning cortisol warrants context. Your care team will review alongside symptoms and related hormones before any next step.",
    },
  },
  tsh: {
    base: "TSH is the pituitary's signal to the thyroid — the most sensitive first-line screen for underactive or overactive thyroid function.",
    byStatus: {
      optimal:
        "Thyroid signalling looks healthy. No action needed beyond routine monitoring.",
      watch:
        "Subtly off. Ensure adequate iodine (iodized salt), selenium (2 Brazil nuts daily is plenty), and recheck in 8–12 weeks.",
      high: "Suggests an underactive thyroid. Your care team will review free T4/T3 and symptoms before deciding whether treatment is warranted.",
      low: "Suggests an overactive thyroid. Your care team will review free T4/T3 and symptoms before next steps.",
    },
  },
  ft4: {
    base: "Free T4 measures the reservoir of thyroid hormone circulating and available for conversion to the more active T3.",
    byStatus: {
      optimal:
        "In a healthy band — no action needed beyond routine monitoring.",
      watch:
        "Slightly off. Your care team will review alongside TSH and free T3 before recommending a change.",
      high: "Elevated. Your care team will review alongside TSH and symptoms to determine next steps.",
      low: "Below range. Your care team will review alongside TSH and symptoms to determine next steps.",
    },
  },
  ft3: {
    base: "Free T3 is the active thyroid hormone driving metabolism, energy, and temperature regulation in your tissues.",
    byStatus: {
      optimal:
        "In a healthy band. Keep stress, sleep, and nutrition consistent.",
      watch:
        "Slightly off. Ensure adequate selenium, zinc, and iron; your care team will review alongside TSH and free T4.",
      high: "Elevated — your care team will review alongside TSH and symptoms before next steps.",
      low: "Below range — your care team will review alongside TSH and free T4 before next steps.",
    },
  },
  dhea: {
    base: "DHEA-S is an adrenal hormone that declines gradually with age and contributes to energy, libido, and resilience.",
    byStatus: {
      optimal:
        "In a healthy band for your age. Continue sleep, strength training, and stress management.",
      watch:
        "Edging below optimal. Prioritize sleep, reduce chronic stress load, and ensure adequate protein.",
      high: "Above range. Your care team will review alongside other hormones before discussing next steps.",
      low: "Below typical range. Sleep, stress management, and strength training help; your care team may review underlying causes.",
    },
  },

  // --- Inflammation ---
  hscrp: {
    base: "hs-CRP is a sensitive marker of silent, low-grade inflammation — a strong predictor of cardiovascular and metabolic risk.",
    byStatus: {
      optimal:
        "Inflammation looks well-controlled. Keep up sleep, movement, and a fibre-rich diet.",
      watch:
        "Mild inflammation. Prioritize sleep, reduce ultra-processed foods, and add Omega-3-rich foods (fatty fish, flaxseed).",
      high: "Meaningful inflammation present. Your care team will look for root causes — infection, dental issues, visceral fat — alongside lifestyle levers.",
      low: "Low hs-CRP is reassuring and typical of well-controlled inflammation.",
    },
  },
  homo: {
    base: "Homocysteine is an amino acid byproduct; elevated levels reflect suboptimal B-vitamin status and modestly raise cardiovascular risk.",
    byStatus: {
      optimal:
        "In a healthy band. Continue a diet rich in leafy greens, legumes, and whole grains.",
      watch:
        "Slightly above optimal. A B-complex (B6, B9, B12) and reduced processed carbs will help; retest in 90 days.",
      high: "Elevated. Your care team will review B12, folate, and kidney function; targeted supplementation usually normalizes it.",
      low: "Low homocysteine is reassuring and rarely a concern on its own.",
    },
  },
  crp: {
    base: "CRP is a general inflammation marker that rises with infection, injury, or chronic inflammatory states.",
    byStatus: {
      optimal: "Inflammation looks well-controlled. Keep current habits.",
      watch:
        "Mild inflammation. Prioritize sleep, reduce ultra-processed foods, and add Omega-3-rich foods.",
      high: "Elevated — your care team will review for underlying causes before recommending next steps.",
      low: "Low CRP is reassuring and typical of well-controlled inflammation.",
    },
  },

  // --- Vitamins / Nutrients ---
  vitd: {
    base: "Vitamin D supports bone health, immune function, mood, and muscle strength — deficiency is common even in sunny climates.",
    byStatus: {
      optimal:
        "In a healthy band. Keep 10–15 minutes of midday sun a few times weekly and maintain your current dose if supplementing.",
      watch:
        "Sub-optimal for a tropical resident. 15 minutes of morning sun plus a 2,000 IU supplement for six weeks, then retest.",
      high: "Above the upper comfort band — usually from over-supplementation. Your care team will recommend a dosage adjustment.",
      low: "Deficient. A clinician-guided loading dose followed by daily maintenance and sensible sun exposure is the standard path.",
    },
  },
  b12: {
    base: "Vitamin B12 is essential for nerve function and red blood cell formation — often low in vegetarian diets common across India.",
    byStatus: {
      optimal:
        "Healthy level. If vegetarian, continue a reliable B12 supplement or fortified source to stay there.",
      watch:
        "Edging low. Add a daily B12 supplement (methylcobalamin 500–1000 mcg) and retest in 90 days.",
      high: "Usually benign and reflects supplementation. Your care team will review if not supplementing.",
      low: "Low enough to affect energy and nerves. Supplement promptly; your care team may also investigate absorption.",
    },
  },
  vitb12: {
    base: "Vitamin B12 is essential for nerve function and red blood cell formation — often low in vegetarian diets common across India.",
    byStatus: {
      optimal:
        "Healthy level. If vegetarian, continue a reliable B12 supplement or fortified source to stay there.",
      watch:
        "Edging low. Add a daily B12 supplement (methylcobalamin 500–1000 mcg) and retest in 90 days.",
      high: "Usually benign and reflects supplementation. Your care team will review if not supplementing.",
      low: "Low enough to affect energy and nerves. Supplement promptly; your care team may also investigate absorption.",
    },
  },
  folate: {
    base: "Folate (B9) supports DNA synthesis and red blood cell production — leafy greens, legumes, and fortified grains are the primary sources.",
    byStatus: {
      optimal:
        "Healthy level. Keep leafy greens and legumes in regular rotation.",
      watch:
        "Edging low. Add more leafy greens (palak, methi), lentils, and fortified grains; consider a B-complex if plant-based.",
      high: "Usually benign and reflects supplementation — your care team will review in context of B12 status.",
      low: "Low folate. Increase leafy greens and legumes; a short course of supplementation typically restores levels.",
    },
  },
  ferritin: {
    base: "Ferritin reflects your body's iron stores — low values precede frank iron-deficiency anaemia by months.",
    byStatus: {
      optimal:
        "Iron stores look strong. Keep iron-rich foods (leafy greens, lentils, red meat if you eat it) in rotation.",
      watch:
        "Stores trending low. Pair iron-rich foods with Vitamin C (amla, citrus, curry leaves with lemon) and limit tea or coffee near meals.",
      high: "Elevated — often reflects inflammation or iron overload. Your care team will investigate the cause before any supplementation change.",
      low: "Iron-deficient. Clinician-guided iron supplementation plus dietary changes; root-cause review if persistently low.",
    },
  },

  // --- Organ (Kidney / Liver) ---
  creat: {
    base: "Creatinine is a muscle-breakdown byproduct cleared by the kidneys — a core kidney-function marker.",
    byStatus: {
      optimal:
        "Kidney filtration looks healthy. Stay well-hydrated and keep moving.",
      watch:
        "Slightly off. Hydration, avoiding unnecessary NSAIDs, and retesting in 90 days is usually enough.",
      high: "Elevated — your care team will review eGFR, hydration status, and medications before next steps.",
      low: "Low creatinine often reflects low muscle mass; your care team will review alongside eGFR and symptoms.",
    },
  },
  creatinine: {
    base: "Creatinine is a muscle-breakdown byproduct cleared by the kidneys — a core kidney-function marker.",
    byStatus: {
      optimal:
        "Kidney filtration looks healthy. Stay well-hydrated and keep moving.",
      watch:
        "Slightly off. Hydration, avoiding unnecessary NSAIDs, and retesting in 90 days is usually enough.",
      high: "Elevated — your care team will review eGFR, hydration status, and medications before next steps.",
      low: "Low creatinine often reflects low muscle mass; your care team will review alongside eGFR and symptoms.",
    },
  },
  egfr: {
    base: "eGFR estimates how efficiently your kidneys filter waste — a more direct functional measure than creatinine alone.",
    byStatus: {
      optimal:
        "Kidney function looks healthy. Stay well-hydrated and keep moving.",
      watch:
        "Slightly reduced. Review hydration, blood pressure, and medication use; retest in 90 days.",
      high: "Unusually high values are typically benign and reflect lab variability — your care team will review in context.",
      low: "Reduced filtration. Your care team will review blood pressure, diabetes status, and medications to identify reversible causes.",
    },
  },
  uricacid: {
    base: "Uric acid is a byproduct of purine metabolism — high levels contribute to gout and metabolic disease risk.",
    byStatus: {
      optimal:
        "In a healthy band. Continue balanced meals and steady hydration.",
      watch:
        "Trending up. Reduce sweetened drinks and alcohol, moderate red meat and organ meats, and hydrate consistently.",
      high: "Elevated — gout and metabolic risk rise. Reduce sugar and alcohol, increase cherries and water; your care team may discuss medication.",
      low: "Low uric acid is rarely a concern on its own.",
    },
  },
  alt: {
    base: "ALT is a liver enzyme that rises when liver cells are stressed or inflamed — a sensitive early marker of liver health.",
    byStatus: {
      optimal:
        "Liver looks calm. Continue balanced meals and moderate alcohol intake.",
      watch:
        "Mildly elevated. Reduce alcohol, cut added sugars, and prioritize movement; fatty liver is the usual suspect.",
      high: "Elevated enough to warrant investigation. Your care team will review for fatty liver, medications, and other causes.",
      low: "Low ALT is typically unremarkable; your care team will review in context.",
    },
  },
  ast: {
    base: "AST is a liver and muscle enzyme — best interpreted alongside ALT and recent physical activity.",
    byStatus: {
      optimal:
        "Liver looks calm. Continue balanced meals and moderate alcohol intake.",
      watch:
        "Mildly elevated. Hard workouts can transiently raise AST; retest rested and review alcohol and medications.",
      high: "Elevated — your care team will review alongside ALT, alcohol use, and medications before next steps.",
      low: "Low AST is typically unremarkable; your care team will review in context.",
    },
  },

  // --- Blood (CBC) ---
  hgb: {
    base: "Hemoglobin carries oxygen from your lungs to every tissue — a core fatigue and endurance marker.",
    byStatus: {
      optimal:
        "Healthy level. Keep iron- and B12-rich foods in regular rotation.",
      watch:
        "Edging low. Prioritize iron-rich foods (lentils, palak, jaggery) with a Vitamin C source, and ensure adequate B12.",
      high: "Elevated — often linked to dehydration, smoking, or altitude. Your care team will review the underlying cause.",
      low: "Anaemia present. Clinician-guided iron or B12 repletion depending on the cause; root-cause review if persistent.",
    },
  },
  hemoglobin: {
    base: "Hemoglobin carries oxygen from your lungs to every tissue — a core fatigue and endurance marker.",
    byStatus: {
      optimal:
        "Healthy level. Keep iron- and B12-rich foods in regular rotation.",
      watch:
        "Edging low. Prioritize iron-rich foods (lentils, palak, jaggery) with a Vitamin C source, and ensure adequate B12.",
      high: "Elevated — often linked to dehydration, smoking, or altitude. Your care team will review the underlying cause.",
      low: "Anaemia present. Clinician-guided iron or B12 repletion depending on the cause; root-cause review if persistent.",
    },
  },
  rbc: {
    base: "Red blood cell count complements hemoglobin and hematocrit in characterising the oxygen-carrying capacity of your blood.",
    byStatus: {
      optimal: "Healthy count. Keep iron and B12 intake consistent.",
      watch:
        "Slightly off. Your care team will review alongside hemoglobin and MCV before any change.",
      high: "Elevated — often reflects dehydration or altitude exposure. Your care team will interpret alongside hemoglobin.",
      low: "Reduced count. Your care team will review alongside hemoglobin and iron status to identify the cause.",
    },
  },
  wbc: {
    base: "White blood cells are your body's frontline immune defense — values shift with infection, inflammation, and stress.",
    byStatus: {
      optimal: "Immune signalling looks healthy. No action needed.",
      watch:
        "Mildly off. Often transient after recent illness or stress; retest in a few weeks if asymptomatic.",
      high: "Elevated — usually reflects infection, inflammation, or stress. Your care team will review symptoms and context.",
      low: "Low count. Your care team will review for underlying causes — viral illness, medications, or nutritional gaps.",
    },
  },
  plt: {
    base: "Platelets are the clotting cells in your blood — essential for stopping bleeding and healing tissue injury.",
    byStatus: {
      optimal: "Healthy count. No action needed.",
      watch:
        "Slightly off. Often transient; your care team will review in context of recent illness or medications.",
      high: "Elevated — often reactive to inflammation or iron deficiency. Your care team will review the underlying cause.",
      low: "Reduced count. Your care team will review medications, viral exposure, and related markers before next steps.",
    },
  },
  platelets: {
    base: "Platelets are the clotting cells in your blood — essential for stopping bleeding and healing tissue injury.",
    byStatus: {
      optimal: "Healthy count. No action needed.",
      watch:
        "Slightly off. Often transient; your care team will review in context of recent illness or medications.",
      high: "Elevated — often reactive to inflammation or iron deficiency. Your care team will review the underlying cause.",
      low: "Reduced count. Your care team will review medications, viral exposure, and related markers before next steps.",
    },
  },
};

const FALLBACK =
  "This marker is outside our reference database. Your care team will review it.";

/**
 * Composes a base primer + status-specific lifestyle guidance for a biomarker.
 *
 * @param id     - The biomarker id (mock keys like "ldl", "vitd", or extended canonical keys).
 * @param name   - The human-readable biomarker name (kept in signature for future fallback composition).
 * @param status - The classified biomarker status — "optimal" | "watch" | "high" | "low".
 */
export function explainerFor(
  id: string,
  name: string,
  status: BiomarkerStatus,
): string {
  void name; // reserved for richer fallback composition in a later phase
  const entry = EXPLAINER_MAP[id];
  if (!entry) return FALLBACK;
  return `${entry.base}\n\n${entry.byStatus[status]}`;
}
