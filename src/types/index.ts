// === Stream Event Types ===

export type StreamEvent =
  | { type: "stage_start"; stage: string; label: string; timestamp: number }
  | { type: "stage_complete"; stage: string; durationMs: number; timestamp: number }
  | { type: "finding"; stage: string; source: string; icon: string; label: string; detail?: string; severity?: "info" | "warning" | "danger" | "safe"; link?: string; timestamp: number }
  | { type: "verdict"; data: FinalVerdict; timestamp: number }
  | { type: "error"; message: string; fatal: boolean; timestamp: number };

// === Stage 1: Understand ===

export interface UnderstandingResult {
  contentType: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  reasoning: string;
  redFlags: string[];
  entities: {
    names: string[];
    organizations: string[];
    urls: string[];
    emails: string[];
    phones: string[];
    cryptoAddresses: string[];
    claims: string[];
  };
  searchQueries: string[];
}

// === Stage 2: Investigate ===

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface DomainInfo {
  domain: string;
  registered: string | null;
  registrar: string | null;
  ageInDays: number | null;
  error?: string;
}

export interface URLCheckResult {
  url: string;
  status: number | null;
  redirectsTo: string | null;
  hasSSL: boolean;
  resolves: boolean;
  error?: string;
}

export interface EmailCheckResult {
  email: string;
  domain: string;
  isFreeProvider: boolean;
  domainResolves: boolean;
  error?: string;
}

export interface InvestigationResults {
  webSearches: Array<{ query: string; results: SearchResult[] }>;
  domainChecks: DomainInfo[];
  urlChecks: URLCheckResult[];
  emailChecks: EmailCheckResult[];
}

// === Stage 3: Verdict ===

export interface FinalVerdict {
  trustScore: number;
  severity: "SAFE" | "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "CRITICAL_DANGER";
  verdict: string;
  summary: string;
  flags: Array<{
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    finding: string;
    source: string;
    evidence?: string;
    link?: string;
  }>;
  sources: SearchResult[];
  recommendations: string[];
  confidence: number;
}
