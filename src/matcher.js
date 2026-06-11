import OpenAI from "openai";
import { truncate } from "./utils.js";
import { formatPreferencesForPrompt } from "./filters/preferences.js";

const SYSTEM_PROMPT_BASE = `You are a career advisor. Given a candidate resume and a job posting, evaluate how well the candidate fits the role.

Score fit on a scale of 0 to 5:
- 0-1: Poor fit — major gaps in skills, experience, or seniority
- 1-2: Weak fit — some overlap but significant mismatches
- 2-3: Moderate fit — reasonable overlap with notable gaps
- 3-4: Good fit — strong alignment with minor gaps
- 4-5: Excellent fit — resume closely matches requirements

Be realistic and conservative. Only score above 3 if there is clear evidence in the resume.

Respond with valid JSON only:
{
  "score": <number 0-5, one decimal place>,
  "whyFit": "<2-4 sentences explaining specific resume strengths that match this role>",
  "gaps": "<1-2 sentences on main gaps, if any>"
}`;

function buildSystemPrompt(preferences) {
  if (!preferences?.enabled) return SYSTEM_PROMPT_BASE;

  return `${SYSTEM_PROMPT_BASE}

Candidate preferences (apply strictly — downscore roles that violate these):
${formatPreferencesForPrompt(preferences)}`;
}

export async function scoreJobFit({ resume, job, openaiApiKey, model, preferences }) {
  const client = new OpenAI({ apiKey: openaiApiKey });

  const userPrompt = `## Resume
${truncate(resume, 4000)}

## Job
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
URL: ${job.url}

Description:
${truncate(job.description, 3000)}`;

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(preferences) },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No response when scoring: ${job.title}`);

  const parsed = JSON.parse(content);
  const score = Number(parsed.score);

  if (Number.isNaN(score) || score < 0 || score > 5) {
    throw new Error(`Invalid score returned for ${job.title}: ${parsed.score}`);
  }

  return {
    score,
    whyFit: parsed.whyFit || "No explanation provided.",
    gaps: parsed.gaps || "",
  };
}

export async function matchJobs({ jobs, resume, openaiApiKey, model, minFitScore, preferences, onProgress }) {
  const matches = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    onProgress?.(i + 1, jobs.length, job);

    try {
      const result = await scoreJobFit({ resume, job, openaiApiKey, model, preferences });
      if (result.score > minFitScore) {
        matches.push({ ...job, ...result });
        console.log(`    ★ ${job.title} @ ${job.company} — ${result.score}/5`);
      } else {
        console.log(`    · ${job.title} @ ${job.company} — ${result.score}/5 (below threshold)`);
      }
    } catch (err) {
      console.error(`    ✗ ${job.title} — ${err.message}`);
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
