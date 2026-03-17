import { AGENTS, AgentResult, TrustReport } from "./agents";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";

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
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://trustcheck.ai",
      "X-Title": "TrustCheck AI",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "{}";
}

function parseJSON(text: string): Record<string, unknown> {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through
      }
    }
    // Try to find JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // fall through
      }
    }
    return { raw: text };
  }
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

  // Process OSINT result
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

  // Process Forensic result
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

    // Build final report from verdict
    const v = verdictData as Record<string, unknown>;
    return {
      score: (v.trustScore as number) ?? 50,
      verdict: (v.verdict as string) ?? "Analysis complete.",
      severity: (v.severity as TrustReport["severity"]) ?? "MODERATE_RISK",
      agentResults: results,
      summary: (v.summary as string) ?? "",
      recommendations: (v.recommendations as string[]) ?? [],
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

    // Fallback report
    return {
      score: 50,
      verdict: "Analysis partially complete. Some agents encountered errors.",
      severity: "MODERATE_RISK",
      agentResults: results,
      summary: "The analysis could not be fully completed.",
      recommendations: ["Try again or manually verify the content."],
    };
  }
}
