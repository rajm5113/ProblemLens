import { T } from "../tokens";

export interface Problem {
  id: number;
  pipId: string;
  sector: string;
  opportunityScore: number;
  title: string;
  painSummary: string;
  tags: string[];
  // Deep dive fields
  userType: string[];
  geography: string;
  frequency: string;
  source: string;
  confidence: "High" | "Medium" | "Low";
  painPoints: string[];
  solutions: string[];
  scores: {
    severity: number;
    marketPotential: number;
    aiFeasibility: number;
    competition: number;
  };
}

export const SECTOR_COLORS: Record<string, string> = {
  HEALTHCARE:             T.sector.healthcare,
  FINTECH:                T.sector.fintech,
  "FINTECH / RETAIL":     T.sector.fintech,
  "FINTECH / CREATOR":    T.sector.fintech,
  EDUCATION:              T.sector.education,
  AGRICULTURE:            T.sector.agriculture,
  "GOVTECH / LEGAL":      T.sector.govtech,
  "LEGAL / GOVTECH":      T.sector.govtech,
  CLEANTECH:              T.sector.cleantech,
  "EMPLOYMENT / EDTECH":  T.sector.employment,
  "CREATOR ECONOMY":      T.sector.creator,
  "RARE DISEASE":         T.sector.rareDisease,
  TECHNOLOGY:             T.sector.technology,
};

export function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector.toUpperCase()] || T.sector.education;
}

export function getScoreGradient(value: number): { from: string; to: string } {
  if (value >= 8) return { from: T.accent.primary, to: T.accent.primaryDark };
  if (value >= 5) return { from: T.score.medium, to: "#F57C00" };
  return { from: T.score.low, to: "#D32F2F" };
}

export function getBarColor(value: number, invert = false): string {
  if (invert) {
    if (value <= 4) return T.score.high;
    if (value <= 7) return T.score.medium;
    return T.score.low;
  }
  if (value >= 8) return T.score.high;
  if (value >= 5) return T.score.medium;
  return T.score.low;
}

export const PROBLEMS: Problem[] = [
  // ── PIP-001 ──────────────────────────────────────────────
  {
    id: 1,
    pipId: "PIP-001",
    sector: "Education",
    opportunityScore: 7,
    title: "Students struggle to track multiple course deadlines across platforms",
    painSummary: "No single unified view of tasks across LMS platforms leads to missed assignments.",
    tags: ["College Students", "India", "High"],
    userType: ["College Students"],
    geography: "India",
    frequency: "High",
    source: "Reddit (r/india), Product Hunt",
    confidence: "Medium",
    painPoints: [
      "Deadlines scattered across Google Classroom, Moodle, Teams, and email",
      "No unified calendar view leads to missed assignments and grade penalties",
      "Constant context-switching between platforms increases cognitive load",
    ],
    solutions: [
      "Universal LMS aggregator that pulls deadlines from all platforms via API",
      "AI-powered priority engine that ranks tasks by urgency and effort required",
      "Smart notification system with personalized reminders based on work habits",
    ],
    scores: { severity: 7, marketPotential: 7, aiFeasibility: 8, competition: 6 },
  },

  // ── PIP-002 ──────────────────────────────────────────────
  {
    id: 2,
    pipId: "PIP-002",
    sector: "Healthcare",
    opportunityScore: 9,
    title: "Rural ASHA workers lack digital tools to record and report patient data accurately",
    painSummary: "Paper-based records get lost or damaged in field conditions, delaying outbreak detection.",
    tags: ["ASHA Workers", "India", "Very High"],
    userType: ["ASHA Workers", "Rural Patients"],
    geography: "India",
    frequency: "Very High",
    source: "Startup India, Smart India Hackathon",
    confidence: "High",
    painPoints: [
      "Paper-based records get lost or damaged in field conditions",
      "No real-time reporting to PHCs — delays outbreak detection by days",
      "Low digital literacy makes complex apps unusable for frontline workers",
    ],
    solutions: [
      "Voice-first Hindi app with offline data sync for field conditions",
      "WhatsApp-based symptom reporting via structured conversational chat",
      "AI agent to auto-summarize field reports for PHC doctors",
    ],
    scores: { severity: 9, marketPotential: 8, aiFeasibility: 8, competition: 3 },
  },

  // ── PIP-003 ──────────────────────────────────────────────
  {
    id: 3,
    pipId: "PIP-003",
    sector: "Fintech / Retail",
    opportunityScore: 8,
    title: "Small kirana store owners cannot access credit due to lack of formal financial records",
    painSummary: "Forced to rely on high-interest informal moneylenders due to invisible cash-based operations.",
    tags: ["Kirana Store Owners", "India", "Very High"],
    userType: ["Kirana Store Owners"],
    geography: "India",
    frequency: "Very High",
    source: "Reddit (r/india), Startup India",
    confidence: "High",
    painPoints: [
      "No GST filing or digital transaction history to show formal lenders",
      "Forced to rely on high-interest informal moneylenders for working capital",
      "Cash-based operations remain entirely invisible to formal credit systems",
    ],
    solutions: [
      "AI-powered bookkeeping app that auto-generates credit profiles from sales data",
      "UPI transaction analysis to build alternative credit scores for unbanked merchants",
      "Vernacular-language onboarding for low-literacy users across Tier 2/3 cities",
    ],
    scores: { severity: 8, marketPotential: 9, aiFeasibility: 7, competition: 7 },
  },

  // ── PIP-004 ──────────────────────────────────────────────
  {
    id: 4,
    pipId: "PIP-004",
    sector: "Agriculture",
    opportunityScore: 9,
    title: "Farmers receive inaccurate or delayed weather and crop advisory information",
    painSummary: "Generic advisories not tailored to local soil or microclimate conditions reduce yield.",
    tags: ["Smallholder Farmers", "India", "High"],
    userType: ["Smallholder Farmers"],
    geography: "India",
    frequency: "High",
    source: "Startup India, NASSCOM",
    confidence: "High",
    painPoints: [
      "National weather services lack block-level or field-level granularity for farmers",
      "Crop advisory SMS services provide generic advice ignoring local soil type and crop variety",
      "Delayed or incorrect advisory leads to wrong pesticide use and crop failure",
    ],
    solutions: [
      "Hyperlocal weather prediction using satellite + IoT sensor networks at village level",
      "AI crop advisor trained on regional datasets to deliver personalized voice-based guidance",
      "WhatsApp-integrated advisory bot with vernacular language support for low-literacy farmers",
    ],
    scores: { severity: 9, marketPotential: 9, aiFeasibility: 7, competition: 5 },
  },

  // ── PIP-005 ──────────────────────────────────────────────
  {
    id: 5,
    pipId: "PIP-005",
    sector: "Employment / EdTech",
    opportunityScore: 8,
    title: "First-time job seekers in Tier 2/3 cities cannot navigate the interview process",
    painSummary: "No access to career counselors or professional networks leaves candidates underprepared.",
    tags: ["First-time Job Seekers", "India", "Very High"],
    userType: ["First-time Job Seekers", "Tier 2/3 City Youth"],
    geography: "India",
    frequency: "Very High",
    source: "LinkedIn India, NASSCOM",
    confidence: "High",
    painPoints: [
      "No mentors or career counselors accessible in smaller cities for interview prep",
      "Candidates unaware of standard resume formats and professional networking norms",
      "English communication barrier blocks placement at MNC and startup roles",
    ],
    solutions: [
      "AI mock interview coach with real-time feedback in regional languages",
      "Peer mentorship marketplace matching aspirants with working professionals from same city",
      "Skill gap analyzer that maps candidate profile to job description and suggests learning path",
    ],
    scores: { severity: 8, marketPotential: 9, aiFeasibility: 9, competition: 4 },
  },

  // ── PIP-006 ──────────────────────────────────────────────
  {
    id: 6,
    pipId: "PIP-006",
    sector: "Healthcare",
    opportunityScore: 8,
    title: "Hospital OPD queues cause patients to wait 4–6 hours for a 5-minute consultation",
    painSummary: "No intelligent slot booking or triage system at public hospitals wastes patients' time.",
    tags: ["OPD Patients", "India", "Very High"],
    userType: ["OPD Patients", "Hospital Staff"],
    geography: "India",
    frequency: "Very High",
    source: "Smart India Hackathon, NASSCOM",
    confidence: "High",
    painPoints: [
      "Physical token systems create crowding and long waits at government hospital OPDs",
      "No pre-triage system means critical patients wait alongside minor ailment cases",
      "Patients travel far without knowing doctor availability, leading to wasted trips",
    ],
    solutions: [
      "AI-powered triage chatbot that pre-classifies case severity and routes to correct doctor",
      "SMS-based slot booking system accessible without smartphones or internet access",
      "Real-time OPD queue dashboard visible on hospital entrance screens and mobile app",
    ],
    scores: { severity: 8, marketPotential: 8, aiFeasibility: 8, competition: 6 },
  },

  // ── PIP-007 ──────────────────────────────────────────────
  {
    id: 7,
    pipId: "PIP-007",
    sector: "CleanTech",
    opportunityScore: 8,
    title: "Municipal solid waste segregation at source remains near-zero despite government mandates",
    painSummary: "Residents don't know or follow dry/wet/hazardous classification rules consistently.",
    tags: ["Urban Residents", "India", "Very High"],
    userType: ["Urban Residents", "Municipal Corporations"],
    geography: "India",
    frequency: "Very High",
    source: "Smart India Hackathon, Reddit (r/india)",
    confidence: "High",
    painPoints: [
      "Residents lack clear, contextual guidance on waste classification at the moment of disposal",
      "Mixed waste leads to 60%+ of recyclables going to landfill instead of recycling chains",
      "Municipal apps are complex and have low adoption among non-tech-savvy residents",
    ],
    solutions: [
      "AI image recognition app that identifies waste type from a photo and tells how to dispose",
      "Gamified household waste tracking with monthly scores and community leaderboards",
      "Integration with municipal collection schedule to remind residents before pickup day",
    ],
    scores: { severity: 8, marketPotential: 8, aiFeasibility: 8, competition: 3 },
  },

  // ── PIP-008 ──────────────────────────────────────────────
  {
    id: 8,
    pipId: "PIP-008",
    sector: "Legal / GovTech",
    opportunityScore: 8,
    title: "Low-income citizens cannot afford legal aid for everyday disputes and rights violations",
    painSummary: "Legal aid clinics are understaffed and under-accessed, leaving most disputes unresolved.",
    tags: ["Low-income Citizens", "India", "High"],
    userType: ["Low-income Citizens", "Legal Aid Workers"],
    geography: "India",
    frequency: "High",
    source: "Startup India, Smart India Hackathon",
    confidence: "High",
    painPoints: [
      "Legal consultation costs ₹2000–10,000 per hour, unaffordable for low-income households",
      "Legal aid clinics lack awareness — most citizens don't know they exist or qualify",
      "Complex legal language in documents creates dependency on intermediaries who exploit users",
    ],
    solutions: [
      "AI legal advisor trained on Indian law that answers questions in plain language for free",
      "Document simplification tool that translates legal notices into plain Hindi/regional languages",
      "Community paralegal training program that creates local legal champions in each ward",
    ],
    scores: { severity: 8, marketPotential: 8, aiFeasibility: 8, competition: 4 },
  },

  // ── PIP-009 ──────────────────────────────────────────────
  {
    id: 9,
    pipId: "PIP-009",
    sector: "Healthcare",
    opportunityScore: 9,
    title: "Sickle cell disease patients in tribal India receive fragmented, inconsistent care",
    painSummary: "Lack of specialist access and disease management tools leads to preventable crises.",
    tags: ["Tribal Patients", "India", "High"],
    userType: ["Sickle Cell Patients", "Tribal Health Workers"],
    geography: "India",
    frequency: "High",
    source: "NASSCOM, Startup India",
    confidence: "High",
    painPoints: [
      "Tribal areas have near-zero hematologist coverage, forcing patients to travel 100+ km",
      "No disease management app exists for tracking pain episodes, triggers, and medication",
      "Screening programs identify patients but lack follow-up infrastructure to manage them",
    ],
    solutions: [
      "Offline-capable patient registry app for ASHA workers to track and manage sickle cell cases",
      "AI symptom monitor that alerts caregivers to early signs of pain crisis via SMS",
      "Tele-hematology platform connecting tribal health centers with specialist doctors remotely",
    ],
    scores: { severity: 9, marketPotential: 8, aiFeasibility: 8, competition: 2 },
  },

  // ── PIP-010 ──────────────────────────────────────────────
  {
    id: 10,
    pipId: "PIP-010",
    sector: "Fintech / Retail",
    opportunityScore: 7,
    title: "Independent creators in India cannot receive international payments without high fees",
    painSummary: "Complex KYC and 3–5% conversion fees make global monetization unviable for small creators.",
    tags: ["Independent Creators", "India", "High"],
    userType: ["Independent Creators", "Freelancers"],
    geography: "India",
    frequency: "High",
    source: "Reddit (r/india), Product Hunt",
    confidence: "Medium",
    painPoints: [
      "PayPal charges 4.4% + fixed fee on international transfers into Indian accounts",
      "Stripe and Paddle are unavailable for Indian-registered individual creators",
      "Complex FEMA compliance and bank paperwork discourages creator exports",
    ],
    solutions: [
      "Creator-focused cross-border payment wrapper with auto-compliance and minimal fees",
      "UPI-linked international invoice system that handles FX conversion transparently",
      "Escrow + milestone payment tool designed for digital goods and service creators",
    ],
    scores: { severity: 7, marketPotential: 8, aiFeasibility: 8, competition: 6 },
  },

  // ── PIP-011 ──────────────────────────────────────────────
  {
    id: 11,
    pipId: "PIP-011",
    sector: "Technology",
    opportunityScore: 9,
    title: "Small teams can't monitor, debug, and scale their cloud apps without expensive DevOps expertise",
    painSummary: "Deploying and maintaining cloud infrastructure demands specialist knowledge most early-stage startups simply cannot afford to hire.",
    tags: ["Startups", "India / Global", "Very High"],
    userType: ["Startup Founders", "Indie Developers", "Engineering Leads"],
    geography: "India / Global",
    frequency: "Very High",
    source: "Hacker News, Indie Hackers, YC community forums",
    confidence: "High",
    painPoints: [
      "Cloud provider dashboards (AWS, GCP, Azure) are overwhelming for non-DevOps engineers",
      "Debugging production outages requires reading cryptic logs scattered across multiple services",
      "Auto-scaling misconfigurations lead to surprise bills or unexpected downtime",
      "No affordable, opinionated tooling exists for teams of 1–5 developers",
    ],
    solutions: [
      "AI-driven infra copilot that translates plain-language requests into cloud configuration",
      "Unified observability dashboard with smart alerting tailored to small team workflows",
      "Cost-anomaly detector that flags and explains unexpected billing spikes in real time",
      "One-click deploy templates with sane defaults for the most common startup stack patterns",
    ],
    scores: { severity: 8, marketPotential: 9, aiFeasibility: 9, competition: 5 },
  },
];