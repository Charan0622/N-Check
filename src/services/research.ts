import * as cheerio from "cheerio";
import type { SearchResult, DomainInfo, URLCheckResult, EmailCheckResult } from "@/types";

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "gmx.com", "live.com", "msn.com", "inbox.com", "fastmail.com",
  "tutanota.com", "pm.me", "hey.com",
]);

// --- Web Search via DuckDuckGo HTML ---

export async function searchWeb(query: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result").each((_, el) => {
      const titleEl = $(el).find(".result__a");
      const snippetEl = $(el).find(".result__snippet");
      const title = titleEl.text().trim();
      let url = titleEl.attr("href") || "";

      // DuckDuckGo wraps URLs — extract the real URL
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1]);
      }

      const snippet = snippetEl.text().trim();

      if (title && url && url.startsWith("http")) {
        results.push({ title, url, snippet });
      }
    });

    return results.slice(0, 5);
  } catch {
    return [];
  }
}

// --- Domain RDAP Check ---

export async function checkDomain(domain: string): Promise<DomainInfo> {
  const clean = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].toLowerCase();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://rdap.org/domain/${clean}`, {
      headers: { Accept: "application/rdap+json,application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { domain: clean, registered: null, registrar: null, ageInDays: null, error: `RDAP returned ${response.status}` };
    }

    const data = await response.json();

    let registered: string | null = null;
    let registrar: string | null = null;

    // Find registration date
    const events = data.events as Array<{ eventAction: string; eventDate: string }> | undefined;
    if (events) {
      const regEvent = events.find((e) => e.eventAction === "registration");
      if (regEvent) registered = regEvent.eventDate;
    }

    // Find registrar
    const entities = data.entities as Array<{ roles?: string[]; vcardArray?: unknown[] }> | undefined;
    if (entities) {
      const registrarEntity = entities.find((e) => e.roles?.includes("registrar"));
      if (registrarEntity?.vcardArray) {
        const vcard = registrarEntity.vcardArray as unknown[][];
        if (vcard[1]) {
          const fnEntry = (vcard[1] as unknown[][]).find((e) => e[0] === "fn");
          if (fnEntry) registrar = String(fnEntry[3]);
        }
      }
    }

    let ageInDays: number | null = null;
    if (registered) {
      const regDate = new Date(registered);
      ageInDays = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return { domain: clean, registered, registrar, ageInDays };
  } catch (err) {
    return { domain: clean, registered: null, registrar: null, ageInDays: null, error: String(err) };
  }
}

// --- URL Reachability Check ---

export async function checkURL(url: string): Promise<URLCheckResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const redirectsTo = response.headers.get("location") || null;
    const hasSSL = url.startsWith("https://");

    return {
      url,
      status: response.status,
      redirectsTo,
      hasSSL,
      resolves: response.status < 500,
    };
  } catch (err) {
    return {
      url,
      status: null,
      redirectsTo: null,
      hasSSL: url.startsWith("https://"),
      resolves: false,
      error: String(err),
    };
  }
}

// --- Email Domain Check ---

export async function checkEmailDomain(email: string): Promise<EmailCheckResult> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { email, domain: "", isFreeProvider: false, domainResolves: false, error: "Invalid email" };
  }

  const isFreeProvider = FREE_EMAIL_PROVIDERS.has(domain);

  let domainResolves = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://${domain}`, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    domainResolves = response.status < 500;
  } catch {
    // Try without https
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`http://${domain}`, { method: "HEAD", signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      domainResolves = response.status < 500;
    } catch {
      domainResolves = false;
    }
  }

  return { email, domain, isFreeProvider, domainResolves };
}

// --- Convenience: Search for scam reports ---

export async function searchScamReports(entity: string): Promise<{ query: string; results: SearchResult[] }[]> {
  const queries = [
    `"${entity}" scam`,
    `"${entity}" fraud OR review OR complaint`,
  ];

  const searchPromises = queries.map(async (query) => {
    const results = await searchWeb(query);
    return { query, results };
  });

  return Promise.all(searchPromises);
}
