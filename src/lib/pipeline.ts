import { AGENTS, AgentResult, TrustReport } from "./agents";

const MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1";

interface PipelineCallbacks {
  onAgentStart: (agentId: string) => void;
  onAgentComplete: (agentId: string, result: AgentResult) => void;
  onError: (agentId: string, error: string) => void;
}

async function callNemotron(
  systemPrompt: string,
  userMessage: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      apiKey,
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.choices[0]?.message?.content || "{}";
}

function parseJSON(text: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through
      }
    }
    // Try finding JSON object pattern (greedy — find the largest matching braces)
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Try cleaning common issues
        try {
          const cleaned = objectMatch[0]
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]")
            .replace(/'/g, '"')
            .replace(/\n/g, " ");
          return JSON.parse(cleaned);
        } catch {
          // fall through
        }
      }
    }
    return { raw: text };
  }
}

// Robust field extraction helpers
function extractField<T>(
  obj: Record<string, unknown>,
  keys: string[],
  fallback: T
): T {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key] as T;
    }
  }
  return fallback;
}

export async function runPipeline(
  content: string,
  apiKey: string,
  callbacks: PipelineCallbacks
): Promise<TrustReport> {
  const results: AgentResult[] = [];
  let accumulatedContext = `ORIGINAL CONTENT TO ANALYZE:\n\n${content}\n\n`;

  // Agent 1: Classifier
  const classifierAgent = AGENTS[0];
  callbacks.onAgentStart(classifierAgent.id);
  const startTime1 = Date.now();
  try {
    const classifierOutput = await callNemotron(
      classifierAgent.systemPrompt,
      accumulatedContext,
      apiKey
    );
    const classifierData = parseJSON(classifierOutput);
    const result1: AgentResult = {
      agentId: classifierAgent.id,
      agentName: classifierAgent.name,
      status: "complete",
      findings: classifierOutput,
      structured: classifierData,
      duration: Date.now() - startTime1,
    };
    results.push(result1);
    callbacks.onAgentComplete(classifierAgent.id, result1);
    accumulatedContext += `\n--- CLASSIFIER AGENT FINDINGS ---\n${classifierOutput}\n`;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(classifierAgent.id, errMsg);
    results.push({
      agentId: classifierAgent.id,
      agentName: classifierAgent.name,
      status: "error",
      findings: errMsg,
    });
  }

  // Agent 2: Entity Extractor
  const extractorAgent = AGENTS[1];
  callbacks.onAgentStart(extractorAgent.id);
  const startTime2 = Date.now();
  try {
    const extractorOutput = await callNemotron(
      extractorAgent.systemPrompt,
      accumulatedContext,
      apiKey
    );
    const extractorData = parseJSON(extractorOutput);
    const result2: AgentResult = {
      agentId: extractorAgent.id,
      agentName: extractorAgent.name,
      status: "complete",
      findings: extractorOutput,
      structured: extractorData,
      duration: Date.now() - startTime2,
    };
    results.push(result2);
    callbacks.onAgentComplete(extractorAgent.id, result2);
    accumulatedContext += `\n--- ENTITY EXTRACTOR FINDINGS ---\n${extractorOutput}\n`;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(extractorAgent.id, errMsg);
    results.push({
      agentId: extractorAgent.id,
      agentName: extractorAgent.name,
      status: "error",
      findings: errMsg,
    });
  }

  // Agents 3 & 4: OSINT + Forensic (parallel)
  const osintAgent = AGENTS[2];
  const forensicAgent = AGENTS[3];

  callbacks.onAgentStart(osintAgent.id);
  callbacks.onAgentStart(forensicAgent.id);

  const [osintResult, forensicResult] = await Promise.allSettled([
    (async () => {
      const start = Date.now();
      const output = await callNemotron(
        osintAgent.systemPrompt,
        accumulatedContext,
        apiKey
      );
      return { output, duration: Date.now() - start };
    })(),
    (async () => {
      const start = Date.now();
      const output = await callNemotron(
        forensicAgent.systemPrompt,
        accumulatedContext,
        apiKey
      );
      return { output, duration: Date.now() - start };
    })(),
  ]);

  if (osintResult.status === "fulfilled") {
    const data = parseJSON(osintResult.value.output);
    const r: AgentResult = {
      agentId: osintAgent.id,
      agentName: osintAgent.name,
      status: "complete",
      findings: osintResult.value.output,
      structured: data,
      duration: osintResult.value.duration,
    };
    results.push(r);
    callbacks.onAgentComplete(osintAgent.id, r);
    accumulatedContext += `\n--- OSINT RESEARCHER FINDINGS ---\n${osintResult.value.output}\n`;
  } else {
    const errMsg = osintResult.reason?.message || "OSINT agent failed";
    callbacks.onError(osintAgent.id, errMsg);
    results.push({
      agentId: osintAgent.id,
      agentName: osintAgent.name,
      status: "error",
      findings: errMsg,
    });
  }

  if (forensicResult.status === "fulfilled") {
    const data = parseJSON(forensicResult.value.output);
    const r: AgentResult = {
      agentId: forensicAgent.id,
      agentName: forensicAgent.name,
      status: "complete",
      findings: forensicResult.value.output,
      structured: data,
      duration: forensicResult.value.duration,
    };
    results.push(r);
    callbacks.onAgentComplete(forensicAgent.id, r);
    accumulatedContext += `\n--- FORENSIC ANALYST FINDINGS ---\n${forensicResult.value.output}\n`;
  } else {
    const errMsg = forensicResult.reason?.message || "Forensic agent failed";
    callbacks.onError(forensicAgent.id, errMsg);
    results.push({
      agentId: forensicAgent.id,
      agentName: forensicAgent.name,
      status: "error",
      findings: errMsg,
    });
  }

  // Agent 5: Persuasion Detector
  const persuasionAgent = AGENTS[4];
  callbacks.onAgentStart(persuasionAgent.id);
  const startTime5 = Date.now();
  try {
    const persuasionOutput = await callNemotron(
      persuasionAgent.systemPrompt,
      accumulatedContext,
      apiKey
    );
    const persuasionData = parseJSON(persuasionOutput);
    const result5: AgentResult = {
      agentId: persuasionAgent.id,
      agentName: persuasionAgent.name,
      status: "complete",
      findings: persuasionOutput,
      structured: persuasionData,
      duration: Date.now() - startTime5,
    };
    results.push(result5);
    callbacks.onAgentComplete(persuasionAgent.id, result5);
    accumulatedContext += `\n--- PERSUASION DETECTOR FINDINGS ---\n${persuasionOutput}\n`;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(persuasionAgent.id, errMsg);
    results.push({
      agentId: persuasionAgent.id,
      agentName: persuasionAgent.name,
      status: "error",
      findings: errMsg,
    });
  }

  // Agent 6: Verdict Synthesizer
  const verdictAgent = AGENTS[5];
  callbacks.onAgentStart(verdictAgent.id);
  const startTime6 = Date.now();
  try {
    const verdictOutput = await callNemotron(
      verdictAgent.systemPrompt,
      accumulatedContext,
      apiKey
    );
    const verdictData = parseJSON(verdictOutput);
    const result6: AgentResult = {
      agentId: verdictAgent.id,
      agentName: verdictAgent.name,
      status: "complete",
      findings: verdictOutput,
      structured: verdictData,
      duration: Date.now() - startTime6,
    };
    results.push(result6);
    callbacks.onAgentComplete(verdictAgent.id, result6);

    const v = verdictData as Record<string, unknown>;

    // Robust extraction with many fallback field names
    const score = extractField<number>(v, [
      "trustScore", "trust_score", "TrustScore", "score", "Score",
      "trust_rating", "trustRating", "rating", "overall_score", "overallScore"
    ], 50);

    const verdict = extractField<string>(v, [
      "verdict", "Verdict", "final_verdict", "finalVerdict", "FinalVerdict",
      "assessment", "conclusion", "analysis", "determination", "judgment"
    ], "Analysis complete.");

    const severity = extractField<TrustReport["severity"]>(v, [
      "severity", "Severity", "risk_level", "riskLevel", "RiskLevel",
      "threat_level", "threatLevel", "danger_level", "dangerLevel",
      "overall_risk", "overallRisk"
    ], "MODERATE_RISK");

    const summary = extractField<string>(v, [
      "summary", "Summary", "analysis_summary", "analysisSummary",
      "overall_summary", "overallSummary", "description", "overview",
      "findings_summary", "findingsSummary", "executive_summary",
      "executiveSummary", "report_summary", "reportSummary"
    ], "");

    const recommendations = extractField<string[]>(v, [
      "recommendations", "Recommendations", "actions", "suggested_actions",
      "suggestedActions", "advice", "next_steps", "nextSteps",
      "action_items", "actionItems", "steps", "suggestions"
    ], []);

    return {
      score: Math.max(0, Math.min(100, Math.round(Number(score) || 50))),
      verdict,
      severity,
      agentResults: results,
      summary,
      recommendations: Array.isArray(recommendations) ? recommendations : [],
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(verdictAgent.id, errMsg);
    results.push({
      agentId: verdictAgent.id,
      agentName: verdictAgent.name,
      status: "error",
      findings: errMsg,
    });

    return {
      score: 50,
      verdict: "Analysis partially complete. Some agents encountered errors.",
      severity: "MODERATE_RISK",
      agentResults: results,
      summary: "The analysis could not be fully completed due to errors in the verdict synthesis stage.",
      recommendations: ["Try running the analysis again.", "Manually verify the content using other sources.", "Exercise caution until verification is complete."],
    };
  }
}
