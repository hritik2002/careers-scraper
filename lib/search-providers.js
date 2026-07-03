const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Run a web search via Serper (google.serper.dev) or Google Custom Search. */
export async function runSearch(query, { maxResults = 10 } = {}) {
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    return searchSerper(query, serperKey, maxResults);
  }

  const googleKey = process.env.GOOGLE_API_KEY;
  const googleCx = process.env.GOOGLE_CSE_ID;
  if (googleKey && googleCx) {
    return searchGoogleCse(query, googleKey, googleCx, maxResults);
  }

  return null;
}

export function hasSearchProvider() {
  return Boolean(
    process.env.SERPER_API_KEY || (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID)
  );
}

async function searchSerper(query, apiKey, maxResults) {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: Math.min(maxResults, 10) }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.organic || []).map((item) => ({
    title: item.title || "",
    url: item.link || "",
    snippet: item.snippet || "",
  }));
}

async function searchGoogleCse(query, apiKey, cx, maxResults) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(maxResults, 10)));

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Google CSE error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []).map((item) => ({
    title: item.title || "",
    url: item.link || "",
    snippet: item.snippet || "",
  }));
}
