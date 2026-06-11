export function detectPlatform(url) {
  const parsed = new URL(url);

  if (parsed.hostname.includes("greenhouse.io") || parsed.pathname.includes("/embed/job_board")) {
    return { platform: "greenhouse", company: extractGreenhouseCompany(parsed) };
  }

  if (parsed.hostname.includes("lever.co")) {
    return { platform: "lever", company: extractLeverCompany(parsed) };
  }

  if (parsed.hostname.includes("ashbyhq.com")) {
    return { platform: "ashby", company: extractAshbyCompany(parsed) };
  }

  if (parsed.hostname.includes("kula.ai")) {
    return { platform: "kula", company: extractKulaCompany(parsed) };
  }

  if (parsed.hostname.includes("workable.com")) {
    return { platform: "workable", company: extractWorkableAccount(parsed) };
  }

  if (parsed.hostname.includes("rippling.com")) {
    return { platform: "rippling", company: extractRipplingBoard(parsed) };
  }

  if (parsed.hostname.includes("jobs.gem.com") || isGemCareersPage(parsed)) {
    return { platform: "gem", company: extractGemBoard(parsed) };
  }

  if (parsed.hostname.includes("myworkdayjobs.com")) {
    return { platform: "workday", company: parsed.pathname.split("/").filter(Boolean)[0] || null };
  }

  return { platform: "generic", company: parsed.hostname };
}

function extractGreenhouseCompany(parsed) {
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed" && parts[1] === "job_board") return parts[2];
  return parts[0] || null;
}

function extractLeverCompany(parsed) {
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "jobs" || parts[0] === "careers") return parts[1];
  return parts[0] || null;
}

function extractAshbyCompany(parsed) {
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "jobs" || parts[0] === "posting-api") return parts[parts.length - 1];
  return parts[0] || null;
}

function extractKulaCompany(parsed) {
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts[0] || null;
}

function extractWorkableAccount(parsed) {
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] === "api") return null;
  return parts[0] || null;
}

function extractRipplingBoard(parsed) {
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parts[0] || null;
}

function isGemCareersPage(parsed) {
  return parsed.pathname.includes("/careers");
}

function extractGemBoard(parsed) {
  if (parsed.hostname.includes("jobs.gem.com")) {
    return parsed.pathname.split("/").filter(Boolean)[0] || null;
  }

  return parsed.hostname.replace(/^www\./, "").split(".")[0] || null;
}
