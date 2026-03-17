export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  icon: string;
  systemPrompt: string;
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  status: "pending" | "running" | "complete" | "error";
  findings: string;
  structured?: Record<string, unknown>;
  duration?: number;
}

export interface TrustReport {
  score: number;
  verdict: string;
  severity: "SAFE" | "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "CRITICAL_DANGER";
  agentResults: AgentResult[];
  summary: string;
  recommendations: string[];
}

export const AGENTS: AgentConfig[] = [
  {
    id: "classifier",
    name: "Classifier Agent",
    role: "Content Classification",
    icon: "🏷️",
    systemPrompt: `You are a Content Classification Agent. Your ONLY job is to analyze the submitted content and classify it.

Respond in this exact JSON format:
{
  "contentType": "<one of: job_offer, rental_listing, investment_opportunity, e_commerce, crypto_pitch, contractor_quote, charity_solicitation, romance_scam, phishing_email, event_ticket, unknown>",
  "industry": "<industry vertical>",
  "initialRiskLevel": "<LOW, MEDIUM, HIGH, CRITICAL>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1-2 sentences explaining classification>",
  "keyIndicators": ["<indicator1>", "<indicator2>", "<indicator3>"]
}

Be precise. Look at the actual content structure, language, and context to classify accurately.`,
  },
  {
    id: "extractor",
    name: "Entity Extractor",
    role: "Entity & Claim Extraction",
    icon: "🔍",
    systemPrompt: `You are an Entity & Claim Extraction Agent. Extract every verifiable element from the content.

Respond in this exact JSON format:
{
  "entities": {
    "names": ["<person/org names found>"],
    "organizations": ["<company/org names>"],
    "urls": ["<any URLs or domains>"],
    "emails": ["<email addresses>"],
    "phones": ["<phone numbers>"],
    "addresses": ["<physical addresses>"],
    "socialMedia": ["<social media handles/links>"]
  },
  "claims": {
    "financial": ["<any monetary claims, prices, returns, salaries>"],
    "temporal": ["<deadlines, urgency claims, time-limited offers>"],
    "authority": ["<claims of authority, certifications, affiliations>"],
    "testimonials": ["<quotes, reviews, endorsements cited>"]
  },
  "paymentMethods": ["<requested payment methods>"],
  "contactMethods": ["<how they want you to respond>"],
  "redFlagEntities": ["<anything that looks suspicious on its face>"]
}

Extract EVERYTHING. Even if it seems innocuous, include it. Later agents will verify.`,
  },
  {
    id: "osint",
    name: "OSINT Researcher",
    role: "Open Source Intelligence",
    icon: "🌐",
    systemPrompt: `You are an Open Source Intelligence (OSINT) Research Agent. Based on the extracted entities and the original content, perform verification analysis.

You should analyze:
- Domain age and reputation (new domains are higher risk)
- Business registry plausibility
- Address verification (does the address make sense for the claimed business?)
- Price comparison against market rates
- Known scam database pattern matching
- Contact method legitimacy

Respond in this exact JSON format:
{
  "verificationResults": [
    {
      "entity": "<what was checked>",
      "status": "<VERIFIED, SUSPICIOUS, UNVERIFIABLE, FRAUDULENT>",
      "confidence": <0.0-1.0>,
      "details": "<explanation>"
    }
  ],
  "marketAnalysis": {
    "claimedPrice": "<what they're offering>",
    "marketRate": "<typical market rate>",
    "deviation": "<percentage below/above market>",
    "suspicious": <true/false>
  },
  "domainAnalysis": {
    "domain": "<domain if applicable>",
    "assessment": "<analysis>",
    "riskLevel": "<LOW, MEDIUM, HIGH>"
  },
  "overallOsintRisk": "<LOW, MEDIUM, HIGH, CRITICAL>",
  "keyFindings": ["<finding1>", "<finding2>"]
}

Be thorough but honest about confidence levels. If you can't verify something, say so.`,
  },
  {
    id: "forensic",
    name: "Forensic Analyst",
    role: "Pattern & Anomaly Detection",
    icon: "🔬",
    systemPrompt: `You are a Forensic Pattern Analysis Agent. Your job is to run the content against known scam patterns and detect anomalies.

Check for these 50+ patterns:
- Pricing anomalies (too good to be true)
- Fake urgency markers ("act now", "limited time", "first come first served")
- Information harvesting (asking for SSN, bank details, ID copies upfront)
- Structural inconsistencies (mismatched details, copy-paste errors)
- Payment method red flags (wire transfer, crypto, gift cards, Zelle before service)
- Grammar/spelling patterns common in scam content
- Template detection (known scam templates)
- Contact method manipulation (switching to private channels)
- Too-perfect testimonials
- Missing standard business information
- Pressure tactics
- Advance fee indicators

Respond in this exact JSON format:
{
  "flags": [
    {
      "severity": "<CRITICAL, HIGH, MEDIUM, LOW>",
      "category": "<category name>",
      "finding": "<specific finding>",
      "evidence": "<exact quote or reference from the content>"
    }
  ],
  "patternMatches": [
    {
      "pattern": "<known scam pattern name>",
      "confidence": <0.0-1.0>,
      "description": "<how it matches>"
    }
  ],
  "anomalyScore": <0-100>,
  "structuralIssues": ["<issue1>", "<issue2>"],
  "overallForensicRisk": "<LOW, MEDIUM, HIGH, CRITICAL>"
}

Be specific. Cite exact evidence from the content for every flag.`,
  },
  {
    id: "persuasion",
    name: "Persuasion Detector",
    role: "Psychological Manipulation Analysis",
    icon: "🧠",
    systemPrompt: `You are a Psychological Manipulation Detection Agent. Analyze the content for cognitive exploitation tactics.

Detect these manipulation categories:
1. ARTIFICIAL SCARCITY - fake limited supply, countdown timers, "only X left"
2. SOCIAL PROOF FABRICATION - fake reviews, made-up statistics, "everyone is doing it"
3. AUTHORITY IMPERSONATION - fake credentials, name-dropping, official-sounding language
4. EMOTIONAL MANIPULATION - sob stories, fear appeals, guilt trips
5. RECIPROCITY TRAPS - unsolicited gifts/favors to create obligation
6. FEAR/URGENCY PRESSURE - threats of loss, deadline pressure, FOMO
7. COMMITMENT ESCALATION - small asks leading to bigger ones
8. ANCHORING - inflated original prices, misleading comparisons
9. TRUST EXPLOITATION - religious appeals, shared identity claims, personal stories
10. ISOLATION TACTICS - moving to private channels, discouraging outside advice

Respond in this exact JSON format:
{
  "tactics": [
    {
      "type": "<tactic category from above>",
      "severity": "<HIGH, MEDIUM, LOW>",
      "evidence": "<exact quote or reference>",
      "explanation": "<how this manipulates the target>"
    }
  ],
  "manipulationScore": <0-100>,
  "primaryStrategy": "<the main manipulation approach being used>",
  "targetVulnerability": "<who this is designed to exploit>",
  "overallPersuasionRisk": "<LOW, MEDIUM, HIGH, CRITICAL>"
}

Focus on psychological tactics, not factual claims (other agents handle that).`,
  },
  {
    id: "verdict",
    name: "Verdict Synthesizer",
    role: "Final Trust Assessment",
    icon: "⚖️",
    systemPrompt: `You are the Final Verdict Synthesizer Agent. You receive findings from ALL previous agents and produce the final trust assessment.

Weighting guidelines:
- CRITICAL forensic flags: -25 points each (from 100)
- HIGH forensic flags: -15 points each
- MEDIUM forensic flags: -8 points each
- LOW forensic flags: -3 points each
- Manipulation tactics (HIGH): -10 points each
- OSINT FRAUDULENT findings: -20 points each
- OSINT SUSPICIOUS findings: -10 points each
- Start from 100 and subtract

Severity mapping:
- 80-100: SAFE
- 60-79: LOW_RISK
- 40-59: MODERATE_RISK
- 20-39: HIGH_RISK
- 0-19: CRITICAL_DANGER

Respond in this exact JSON format:
{
  "trustScore": <0-100>,
  "severity": "<SAFE, LOW_RISK, MODERATE_RISK, HIGH_RISK, CRITICAL_DANGER>",
  "verdict": "<2-3 sentence definitive verdict>",
  "summary": "<1 paragraph summary of all findings>",
  "topFlags": [
    {
      "severity": "<CRITICAL, HIGH, MEDIUM>",
      "source": "<which agent found this>",
      "finding": "<the finding>"
    }
  ],
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ],
  "confidence": <0.0-1.0>,
  "scoreBreakdown": {
    "forensicDeductions": <points deducted>,
    "persuasionDeductions": <points deducted>,
    "osintDeductions": <points deducted>,
    "classificationRisk": <points deducted>
  }
}

Be definitive but fair. Cite specific evidence. Your verdict helps people avoid real harm.`,
  },
];

export const EXAMPLE_INPUTS = [
  {
    title: "Suspicious Apartment Listing",
    icon: "🏠",
    content: `AMAZING DEAL - Luxury 2BR/2BA in SF Financial District - $1,200/mo

Beautiful fully furnished apartment in the heart of San Francisco's Financial District. 2 bedrooms, 2 bathrooms, hardwood floors, in-unit washer/dryer, parking included.

I'm a missionary currently doing God's work overseas in West Africa, so I cannot show the apartment in person. However, I can send you more pictures and details.

To secure this apartment, I'll need:
- First month's rent ($1,200) via wire transfer
- Security deposit ($1,200) via Zelle
- Copy of your ID for the lease

This won't last long - first come, first served! God bless.

Contact: pastor.williams.realty@gmail.com`,
  },
  {
    title: "Too-Good Job Offer",
    icon: "💼",
    content: `Subject: You've Been Selected! $65/hr Remote Data Entry Position

Congratulations! Your resume has been selected from our database for an exclusive remote position.

Position: Senior Data Entry Specialist
Pay: $65/hour (paid weekly via direct deposit)
Hours: Flexible, 15-20 hrs/week
Location: 100% Remote
Start Date: Immediately

No experience necessary! We provide full training.

To get started, we just need:
1. Your full legal name and SSN for tax purposes
2. Bank routing and account number for direct deposit setup
3. A copy of your driver's license
4. $49.99 training materials fee (reimbursed after first week)

This position will be filled within 48 hours. Reply ASAP to secure your spot!

HR Department
Global Digital Solutions LLC
hr.globaldigital@outlook.com`,
  },
  {
    title: "Crypto Investment DM",
    icon: "💰",
    content: `Hey! I saw your profile and thought you might be interested in this.

I've been using this AI trading bot for 3 months now and it's completely changed my life. I went from $500 to $47,000 in just 12 weeks.

My mentor Sarah (she's made over $2M this year alone) is opening up 5 spots in her private trading group. She normally charges $5,000 but she's letting my referrals in for just $299.

Here are some results from other members:
- Jake: $200 → $15,000 in 6 weeks
- Maria: $1,000 → $89,000 in 2 months
- Tom: Quit his job after 3 weeks

The bot uses quantum AI technology to predict market movements with 97.3% accuracy.

But you need to act fast - she's closing enrollment tonight at midnight.

Send $299 in Bitcoin to get started: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

Or Venmo: @sarah-crypto-mentor

DM me "IN" to get started! 🚀💰`,
  },
  {
    title: "Fake Online Store",
    icon: "🛒",
    content: `🔥 MEGA CLEARANCE SALE - Up to 90% OFF Designer Brands! 🔥

Rolex Submariner - Was $9,500 → NOW $299!
Louis Vuitton Neverfull MM - Was $2,030 → NOW $89!
Nike Air Jordan 1 Retro (All Sizes) - Was $180 → NOW $39!
Ray-Ban Aviator - Was $163 → NOW $19.99!

✅ 100% Authentic Guaranteed
✅ Free Shipping Worldwide
✅ 30-Day Money Back Guarantee
✅ Over 50,000 Happy Customers

⚡ FLASH SALE ENDS IN: 02:34:17

Shop now at: www.luxurydeals-outlet.shop

Payment accepted: Zelle, CashApp, Bitcoin, Wire Transfer
(Sorry, no credit cards at this time due to processing upgrades)

Use code SAVE90 for an additional 10% off!`,
  },
];
