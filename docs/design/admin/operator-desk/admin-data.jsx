// ONLYOU Operator — dataset

const TODAY_KPIS = [
  { k:'revenue',   label:'Revenue · Today',  value:'₹1,84,250', delta:+12.4, spark:[112,124,132,141,156,170,184] },
  { k:'awaiting',  label:'Awaiting Payment', value:23,          delta:-4,    spark:[28,27,27,25,24,24,23], suffix:'cases' },
  { k:'active',    label:'Live Cases',       value:47,          delta:+8,    spark:[31,34,36,38,41,44,47] },
  { k:'breach',    label:'SLA Breaches',     value:3,           delta:-2,    spark:[6,5,5,4,4,3,3], sev:'breach' },
];

// Lab orders pipeline (consultation → nurse → lab → results → recollection)
const LAB_PIPELINE = [
  { stage:'Consultation', label:'Consult',   count:12, avg:'6m',   color:'var(--amber)' },
  { stage:'Nurse Visit',  label:'Nurse',     count:18, avg:'2.1h', color:'var(--honey)' },
  { stage:'Lab Analysis', label:'Lab',       count:24, avg:'14h',  color:'var(--ink-2)' },
  { stage:'Results',      label:'Results',   count: 9, avg:'22h',  color:'var(--green)' },
  { stage:'Recollection', label:'Recoll.',   count: 2, avg:'18h',  color:'var(--rose)' },
];

// Live lab orders (for table)
const LAB_ORDERS = [
  { id:'LO-8821', patient:'Riya Sharma',    stage:'nurse',  partner:'Vivek K.',        eta:'23m',   sla:'warn',   test:'CBC + Thyroid',       city:'Bengaluru' },
  { id:'LO-8820', patient:'Arjun Iyer',     stage:'lab',    partner:'Healthians Lab',  eta:'1.8h',  sla:'ok',     test:'Lipid · Vit D',       city:'Mumbai' },
  { id:'LO-8819', patient:'Kavya Menon',    stage:'result', partner:'Dr. S. Rao',      eta:'Review',sla:'ok',     test:'HbA1c · Fasting',     city:'Chennai' },
  { id:'LO-8818', patient:'Dev Malhotra',   stage:'nurse',  partner:'Priya N.',        eta:'11m',   sla:'breach', test:'Hormone Panel',       city:'Delhi' },
  { id:'LO-8817', patient:'Maya Krishnan',  stage:'lab',    partner:'Apex Diagnostics',eta:'40m',   sla:'ok',     test:'Allergy Profile',     city:'Pune' },
  { id:'LO-8816', patient:'Rohan Desai',    stage:'recol.', partner:'Vivek K.',        eta:'Tomorrow',sla:'warn', test:'Sample hemolyzed',    city:'Bengaluru' },
];

// Deliveries pipeline (Rx → pharmacy → ready → delivery → OTP)
const DELIVERY_PIPELINE = [
  { stage:'Prescribed',  label:'Rx Ready',  count: 6, avg:'3m',    color:'var(--amber)' },
  { stage:'At Pharmacy', label:'Pharmacy',  count:14, avg:'42m',   color:'var(--honey)' },
  { stage:'Ready',       label:'Ready',     count: 8, avg:'1.1h',  color:'var(--ink-2)' },
  { stage:'Out For Del', label:'Transit',   count:11, avg:'38m',   color:'var(--green)' },
  { stage:'OTP Pending', label:'OTP',       count: 3, avg:'12m',   color:'var(--rose)' },
];

const DELIVERIES = [
  { id:'DL-5532', patient:'Aarav Khanna',   area:'Indiranagar',   status:'transit', rider:'Manish T.',   eta:'14m', sla:'ok',    drug:'Metformin · Atorva' },
  { id:'DL-5531', patient:'Sneha Reddy',    area:'HSR Layout',    status:'otp',     rider:'Deepa S.',    eta:'at door',sla:'warn', drug:'Thyronorm 50' },
  { id:'DL-5530', patient:'Ishaan Banerjee',area:'Koramangala',   status:'ready',   rider:'—',           eta:'assign', sla:'breach',drug:'Vit D + B12' },
  { id:'DL-5529', patient:'Tara Joshi',     area:'Jayanagar',     status:'pharmacy',rider:'—',           eta:'28m', sla:'ok',    drug:'Rosuvastatin' },
];

// Workforce summary
const WORKFORCE = [
  { role:'Doctors',         total:42, online:18, verified:'NMC', accent:'var(--amber)' },
  { role:'Nurses',          total:36, online:22, verified:'Active', accent:'var(--honey)' },
  { role:'Diagnostic Ctrs', total: 8, online: 7, verified:'Partners', accent:'var(--green)' },
  { role:'Pharmacies',      total:14, online:12, verified:'Partners', accent:'var(--ink-2)' },
];

// Feed of live ops events
const FEED = [
  { t:'now',   tag:'SLA',       sev:'breach', text:'DL-5530 ready for 22m — no rider assigned in Koramangala.', cta:'Assign' },
  { t:'2m',    tag:'Payment',   sev:'warn',   text:'₹4,200 refund requested by Riya Sharma (LO-8821). Needs review.', cta:'Review' },
  { t:'6m',    tag:'Lab',       sev:'ok',     text:'Healthians Lab confirmed 24 samples received for batch B-217.' },
  { t:'14m',   tag:'Onboard',   sev:'ok',     text:'Dr. Vikram Seth NMC-verified. Awaiting activation.', cta:'Activate' },
  { t:'22m',   tag:'SLA',       sev:'warn',   text:'LO-8818 nurse visit overdue by 6m in Delhi zone.' },
  { t:'31m',   tag:'Payment',   sev:'ok',     text:'Razorpay cleared ₹38,400 across 9 consultations.' },
];

// Revenue by hour (today)
const REV_HOUR = Array.from({length: 16}, (_, i) => ({
  h: i + 6,
  r: Math.round(800 + 2400 * Math.exp(-Math.pow((i-7)/4, 2)) + Math.random()*1200 + i*120),
}));

// Workforce coverage by city
const COVERAGE = [
  { city:'Bengaluru', nurses:12, riders: 9, gap: 0 },
  { city:'Mumbai',    nurses: 8, riders: 6, gap: 1 },
  { city:'Delhi',     nurses: 7, riders: 5, gap: 2 },
  { city:'Chennai',   nurses: 5, riders: 4, gap: 0 },
  { city:'Pune',      nurses: 4, riders: 3, gap: 0 },
];

function slaClass(s) { return s; }
function stageColor(s) {
  return {
    consultation:'var(--amber)', nurse:'var(--honey)', lab:'var(--ink-2)',
    result:'var(--green)', 'recol.':'var(--rose)',
    pharmacy:'var(--honey)', ready:'var(--ink-2)', transit:'var(--green)', otp:'var(--rose)',
  }[s] || 'var(--muted)';
}

Object.assign(window, {
  TODAY_KPIS, LAB_PIPELINE, LAB_ORDERS, DELIVERY_PIPELINE, DELIVERIES,
  WORKFORCE, FEED, REV_HOUR, COVERAGE, slaClass, stageColor,
});
