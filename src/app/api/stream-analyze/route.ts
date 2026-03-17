import { NextRequest } from "next/server";
import { callNemotron, parseJSON } from "@/services/nvidia";
import { UNDERSTAND_PROMPT, VERDICT_PROMPT } from "@/config/prompts";
import type { UnderstandingResult, InvestigationResults } from "@/types";
import { searchWeb, checkDomain, checkURL, checkEmailDomain } from "@/services/research";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { content, apiKey: clientKey } = await req.json();
  const apiKey = clientKey || process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No API key" }), { status: 401 });
  }
  if (!content?.trim()) {
    return new Response(JSON.stringify({ error: "No content" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`));
        } catch { /* stream may be closed */ }
      };

      try {
        // ==================== STAGE 1: UNDERSTAND ====================
        const stage1Start = Date.now();
        send({ type: "stage_start", stage: "understand", label: "Analyzing content..." });

        let understanding: UnderstandingResult;
        try {
          const raw = await callNemotron(UNDERSTAND_PROMPT, content, apiKey, 4000);
          const parsed = parseJSON(raw) as unknown as UnderstandingResult;
          understanding = {
            contentType: parsed.contentType || "unknown",
            riskLevel: parsed.riskLevel || "MEDIUM",
            confidence: parsed.confidence || 0.5,
            reasoning: parsed.reasoning || "",
            redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
            entities: {
              names: Array.isArray(parsed.entities?.names) ? parsed.entities.names : [],
              organizations: Array.isArray(parsed.entities?.organizations) ? parsed.entities.organizations : [],
              urls: Array.isArray(parsed.entities?.urls) ? parsed.entities.urls : [],
              emails: Array.isArray(parsed.entities?.emails) ? parsed.entities.emails : [],
              phones: Array.isArray(parsed.entities?.phones) ? parsed.entities.phones : [],
              cryptoAddresses: Array.isArray(parsed.entities?.cryptoAddresses) ? parsed.entities.cryptoAddresses : [],
              claims: Array.isArray(parsed.entities?.claims) ? parsed.entities.claims : [],
            },
            searchQueries: Array.isArray(parsed.searchQueries) ? parsed.searchQueries : [],
          };
        } catch (err) {
          send({ type: "finding", stage: "understand", source: "classifier", icon: "\u26A0\uFE0F", label: "Analysis encountered an issue", detail: String(err), severity: "warning" });
          understanding = {
            contentType: "unknown", riskLevel: "MEDIUM", confidence: 0.3, reasoning: "Could not fully analyze content",
            redFlags: [], entities: { names: [], organizations: [], urls: [], emails: [], phones: [], cryptoAddresses: [], claims: [] }, searchQueries: [],
          };
        }

        // Stream understanding findings
        const riskSev = understanding.riskLevel === "CRITICAL" || understanding.riskLevel === "HIGH" ? "danger" : understanding.riskLevel === "MEDIUM" ? "warning" : "info";
        send({ type: "finding", stage: "understand", source: "classifier", icon: "\uD83C\uDFF7\uFE0F",
          label: `Classified as: ${understanding.contentType.replace(/_/g, " ")}`,
          detail: `${understanding.riskLevel} risk — ${understanding.reasoning}`,
          severity: riskSev });

        // Entity summary
        const ent = understanding.entities;
        const entityParts: string[] = [];
        if (ent.urls.length) entityParts.push(`${ent.urls.length} URL${ent.urls.length > 1 ? "s" : ""}`);
        if (ent.emails.length) entityParts.push(`${ent.emails.length} email${ent.emails.length > 1 ? "s" : ""}`);
        if (ent.organizations.length) entityParts.push(`${ent.organizations.length} org${ent.organizations.length > 1 ? "s" : ""}`);
        if (ent.names.length) entityParts.push(`${ent.names.length} name${ent.names.length > 1 ? "s" : ""}`);
        if (ent.phones.length) entityParts.push(`${ent.phones.length} phone${ent.phones.length > 1 ? "s" : ""}`);
        if (ent.cryptoAddresses.length) entityParts.push(`${ent.cryptoAddresses.length} crypto wallet${ent.cryptoAddresses.length > 1 ? "s" : ""}`);
        if (entityParts.length > 0) {
          send({ type: "finding", stage: "understand", source: "extractor", icon: "\uD83D\uDD0D", label: `Extracted ${entityParts.join(", ")}`, severity: "info" });
        }

        // Red flags
        if (understanding.redFlags.length > 0) {
          send({ type: "finding", stage: "understand", source: "analyst", icon: "\uD83D\uDEA9",
            label: `${understanding.redFlags.length} red flag${understanding.redFlags.length > 1 ? "s" : ""} identified`,
            detail: understanding.redFlags.slice(0, 4).join(" | "),
            severity: "danger" });
        }

        send({ type: "stage_complete", stage: "understand", durationMs: Date.now() - stage1Start });

        // ==================== STAGE 2: INVESTIGATE ====================
        const stage2Start = Date.now();
        send({ type: "stage_start", stage: "investigate", label: "Investigating entities..." });

        const investigations: InvestigationResults = { webSearches: [], domainChecks: [], urlChecks: [], emailChecks: [] };

        // Build search queries
        const searchQueries = understanding.searchQueries.slice(0, 4);
        // Also auto-generate queries from organizations
        for (const org of ent.organizations.slice(0, 2)) {
          const q = `"${org}" scam OR fraud`;
          if (!searchQueries.includes(q)) searchQueries.push(q);
        }

        // Run all investigations in parallel
        const tasks: Promise<void>[] = [];

        // Web searches
        for (const query of searchQueries.slice(0, 4)) {
          tasks.push((async () => {
            send({ type: "finding", stage: "investigate", source: "web_search", icon: "\uD83C\uDF10", label: `Searching: "${query}"`, severity: "info" });
            const results = await searchWeb(query);
            investigations.webSearches.push({ query, results });
            if (results.length > 0) {
              send({ type: "finding", stage: "investigate", source: "web_search", icon: "\uD83C\uDF10",
                label: `Found ${results.length} result${results.length > 1 ? "s" : ""} for "${query}"`,
                detail: results[0] ? `Top: "${results[0].title}"` : undefined,
                severity: "warning",
                link: results[0]?.url });
            } else {
              send({ type: "finding", stage: "investigate", source: "web_search", icon: "\uD83C\uDF10",
                label: `No results found for "${query}"`, severity: "info" });
            }
          })());
        }

        // Domain checks
        const domains = new Set<string>();
        for (const url of ent.urls) {
          try {
            const hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
            domains.add(hostname);
          } catch { /* skip invalid URLs */ }
        }
        for (const email of ent.emails) {
          const d = email.split("@")[1]?.toLowerCase();
          if (d && !FREE_EMAIL_PROVIDERS.has(d)) domains.add(d);
        }

        for (const domain of Array.from(domains).slice(0, 3)) {
          tasks.push((async () => {
            send({ type: "finding", stage: "investigate", source: "domain_check", icon: "\uD83D\uDCCB", label: `Checking domain: ${domain}`, severity: "info" });
            const info = await checkDomain(domain);
            investigations.domainChecks.push(info);
            if (info.ageInDays !== null) {
              const severity = info.ageInDays < 30 ? "danger" : info.ageInDays < 90 ? "warning" : "safe";
              send({ type: "finding", stage: "investigate", source: "domain_check", icon: severity === "danger" ? "\uD83D\uDEA8" : "\uD83D\uDCCB",
                label: `${domain} — registered ${info.ageInDays} days ago`,
                detail: info.registrar ? `Registrar: ${info.registrar}` : undefined,
                severity });
            } else if (info.error) {
              send({ type: "finding", stage: "investigate", source: "domain_check", icon: "\uD83D\uDCCB",
                label: `Could not check domain ${domain}`, detail: info.error, severity: "info" });
            }
          })());
        }

        // URL checks
        for (const url of ent.urls.slice(0, 3)) {
          const fullUrl = url.startsWith("http") ? url : `https://${url}`;
          tasks.push((async () => {
            send({ type: "finding", stage: "investigate", source: "url_check", icon: "\uD83D\uDD17", label: `Checking URL: ${fullUrl}`, severity: "info" });
            const result = await checkURL(fullUrl);
            investigations.urlChecks.push(result);
            if (!result.resolves) {
              send({ type: "finding", stage: "investigate", source: "url_check", icon: "\u274C",
                label: `URL does not resolve: ${fullUrl}`, severity: "danger" });
            } else if (result.redirectsTo) {
              send({ type: "finding", stage: "investigate", source: "url_check", icon: "\u21AA\uFE0F",
                label: `URL redirects`, detail: `${fullUrl} → ${result.redirectsTo}`, severity: "warning", link: fullUrl });
            } else {
              send({ type: "finding", stage: "investigate", source: "url_check", icon: "\u2705",
                label: `URL resolves (${result.status})`, detail: fullUrl, severity: "safe", link: fullUrl });
            }
          })());
        }

        // Email checks
        for (const email of ent.emails.slice(0, 3)) {
          tasks.push((async () => {
            const result = await checkEmailDomain(email);
            investigations.emailChecks.push(result);
            if (result.isFreeProvider) {
              send({ type: "finding", stage: "investigate", source: "email_check", icon: "\u26A0\uFE0F",
                label: `Free email provider: ${email}`,
                detail: `${result.domain} is a free email provider — unusual for legitimate business`,
                severity: "warning" });
            } else if (!result.domainResolves) {
              send({ type: "finding", stage: "investigate", source: "email_check", icon: "\u274C",
                label: `Email domain does not resolve: ${result.domain}`, severity: "danger" });
            } else {
              send({ type: "finding", stage: "investigate", source: "email_check", icon: "\u2709\uFE0F",
                label: `Email domain verified: ${result.domain}`, severity: "safe" });
            }
          })());
        }

        // Crypto address warnings
        for (const addr of ent.cryptoAddresses.slice(0, 2)) {
          send({ type: "finding", stage: "investigate", source: "crypto_check", icon: "\uD83D\uDCB0",
            label: `Crypto wallet detected: ${addr.slice(0, 12)}...${addr.slice(-6)}`,
            detail: "Cryptocurrency payments are irreversible and commonly used in scams",
            severity: "danger" });
        }

        // Wait for all parallel tasks
        await Promise.allSettled(tasks);

        if (tasks.length === 0) {
          send({ type: "finding", stage: "investigate", source: "system", icon: "\u2139\uFE0F",
            label: "No entities to investigate", severity: "info" });
        }

        send({ type: "stage_complete", stage: "investigate", durationMs: Date.now() - stage2Start });

        // ==================== STAGE 3: VERDICT ====================
        const stage3Start = Date.now();
        send({ type: "stage_start", stage: "verdict", label: "Generating verdict with evidence..." });

        // Build context for verdict LLM
        const verdictContext = buildVerdictContext(content, understanding, investigations);

        try {
          const raw = await callNemotron(VERDICT_PROMPT, verdictContext, apiKey, 6000);
          const parsed = parseJSON(raw) as Record<string, unknown>;

          const verdict = {
            trustScore: Math.max(0, Math.min(100, Math.round(Number(parsed.trustScore) || 50))),
            severity: String(parsed.severity || "MODERATE_RISK"),
            verdict: String(parsed.verdict || "Analysis complete."),
            summary: String(parsed.summary || ""),
            flags: Array.isArray(parsed.flags) ? parsed.flags : [],
            sources: collectSources(investigations),
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            confidence: Number(parsed.confidence) || 0.5,
          };

          send({ type: "stage_complete", stage: "verdict", durationMs: Date.now() - stage3Start });
          send({ type: "verdict", data: verdict });
        } catch (err) {
          send({ type: "stage_complete", stage: "verdict", durationMs: Date.now() - stage3Start });
          // Fallback verdict from investigation data
          const fallbackVerdict = buildFallbackVerdict(understanding, investigations);
          send({ type: "verdict", data: fallbackVerdict });
          send({ type: "error", message: `Verdict LLM error: ${err}`, fatal: false });
        }

      } catch (err) {
        send({ type: "error", message: String(err), fatal: true });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// Free email providers set (used in domain check logic)
const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "gmx.com", "live.com", "msn.com",
]);

function buildVerdictContext(content: string, understanding: UnderstandingResult, inv: InvestigationResults): string {
  let ctx = `ORIGINAL CONTENT:\n${content}\n\n`;
  ctx += `CONTENT ANALYSIS:\nType: ${understanding.contentType}, Risk: ${understanding.riskLevel}\n`;
  ctx += `Red flags: ${understanding.redFlags.join("; ") || "none"}\n`;
  ctx += `Claims: ${understanding.entities.claims.join("; ") || "none"}\n\n`;

  ctx += `WEB RESEARCH FINDINGS:\n`;
  for (const ws of inv.webSearches) {
    ctx += `Search: "${ws.query}" — ${ws.results.length} results\n`;
    for (const r of ws.results.slice(0, 3)) {
      ctx += `  - "${r.title}" (${r.url}): ${r.snippet}\n`;
    }
  }

  ctx += `\nDOMAIN CHECKS:\n`;
  for (const dc of inv.domainChecks) {
    if (dc.ageInDays !== null) {
      ctx += `  ${dc.domain}: registered ${dc.ageInDays} days ago${dc.registrar ? ` via ${dc.registrar}` : ""}\n`;
    } else {
      ctx += `  ${dc.domain}: could not verify${dc.error ? ` (${dc.error})` : ""}\n`;
    }
  }

  ctx += `\nURL CHECKS:\n`;
  for (const uc of inv.urlChecks) {
    ctx += `  ${uc.url}: ${uc.resolves ? `resolves (${uc.status})` : "DOES NOT RESOLVE"}${uc.redirectsTo ? ` → redirects to ${uc.redirectsTo}` : ""}, SSL: ${uc.hasSSL}\n`;
  }

  ctx += `\nEMAIL CHECKS:\n`;
  for (const ec of inv.emailChecks) {
    ctx += `  ${ec.email}: domain ${ec.domainResolves ? "resolves" : "DOES NOT RESOLVE"}, free provider: ${ec.isFreeProvider}\n`;
  }

  if (understanding.entities.cryptoAddresses.length > 0) {
    ctx += `\nCRYPTO WALLETS DETECTED: ${understanding.entities.cryptoAddresses.join(", ")}\n`;
  }

  return ctx;
}

function collectSources(inv: InvestigationResults): Array<{ title: string; url: string; snippet: string }> {
  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string; snippet: string }> = [];
  for (const ws of inv.webSearches) {
    for (const r of ws.results) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        sources.push(r);
      }
    }
  }
  return sources.slice(0, 8);
}

function buildFallbackVerdict(understanding: UnderstandingResult, inv: InvestigationResults) {
  const riskMap: Record<string, number> = { CRITICAL: 10, HIGH: 30, MEDIUM: 55, LOW: 80 };
  const score = riskMap[understanding.riskLevel] ?? 50;
  const severityMap: Record<string, string> = { CRITICAL: "CRITICAL_DANGER", HIGH: "HIGH_RISK", MEDIUM: "MODERATE_RISK", LOW: "LOW_RISK" };

  return {
    trustScore: score,
    severity: severityMap[understanding.riskLevel] || "MODERATE_RISK",
    verdict: `Content classified as ${understanding.contentType} with ${understanding.riskLevel} risk. ${understanding.reasoning}`,
    summary: `Analysis identified ${understanding.redFlags.length} red flags. ${inv.webSearches.reduce((n, ws) => n + ws.results.length, 0)} web search results were found.`,
    flags: understanding.redFlags.map((f) => ({ severity: understanding.riskLevel === "CRITICAL" ? "CRITICAL" : "HIGH", finding: f, source: "Content Analysis" })),
    sources: collectSources(inv),
    recommendations: [
      "Exercise caution with this content.",
      "Verify all claims independently before taking action.",
      "Do not share personal information or send money.",
    ],
    confidence: understanding.confidence,
  };
}
