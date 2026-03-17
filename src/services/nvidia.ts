const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1";

export async function callNemotron(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens: number = 4000
): Promise<string> {
  const response = await fetch(NVIDIA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
}

export function parseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch { /* fall through */ }
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch {
        try {
          const cleaned = objectMatch[0]
            .replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/'/g, '"').replace(/\n/g, " ");
          return JSON.parse(cleaned);
        } catch { /* fall through */ }
      }
    }
    // Truncation recovery
    const braces = text.match(/\{[\s\S]*/);
    if (braces) {
      let partial = braces[0];
      partial = partial.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "").replace(/:\s*"[^"]*$/, ': ""');
      const ob = (partial.match(/\{/g) || []).length;
      const cb = (partial.match(/\}/g) || []).length;
      const oq = (partial.match(/\[/g) || []).length;
      const cq = (partial.match(/\]/g) || []).length;
      for (let i = 0; i < oq - cq; i++) partial += "]";
      for (let i = 0; i < ob - cb; i++) partial += "}";
      try { return JSON.parse(partial); } catch { /* fall through */ }
    }
    return { raw: text };
  }
}
