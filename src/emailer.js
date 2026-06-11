import nodemailer from "nodemailer";

export function createTransporter(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
}

function groupByCompany(matches) {
  const map = new Map();

  for (const job of matches) {
    const company = job.company?.trim() || "Unknown";
    if (!map.has(company)) map.set(company, []);
    map.get(company).push(job);
  }

  return [...map.entries()]
    .map(([company, jobs]) => ({
      company,
      jobs: jobs.sort((a, b) => b.score - a.score),
      topScore: Math.max(...jobs.map((j) => j.score)),
    }))
    .sort((a, b) => b.topScore - a.topScore || a.company.localeCompare(b.company));
}

function scoreColor(score) {
  if (score >= 4) return { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
  if (score >= 3) return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
  return { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
}

function formatScore(score) {
  return Number.isInteger(score) ? `${score}` : score.toFixed(1);
}

export function buildEmailHtml(matches) {
  const groups = groupByCompany(matches);
  const companyCount = groups.length;

  const companySections = groups
    .map(({ company, jobs }) => {
      const jobRows = jobs
        .map((job) => {
          const colors = scoreColor(job.score);
          const location = job.location?.trim();

          return `
          <tr>
            <td style="padding:0 0 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1f5f9;border-radius:8px;background:#fafbfc;">
                <tr>
                  <td style="padding:14px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;">
                          <a href="${escapeHtml(job.url)}" style="font-size:15px;font-weight:600;color:#0f172a;text-decoration:none;line-height:1.4;">
                            ${escapeHtml(job.title)}
                          </a>
                          ${
                            location
                              ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${escapeHtml(location)}</p>`
                              : ""
                          }
                        </td>
                        <td width="52" align="right" style="vertical-align:top;padding-left:12px;">
                          <span style="display:inline-block;padding:4px 8px;font-size:12px;font-weight:600;color:${colors.text};background:${colors.bg};border:1px solid ${colors.border};border-radius:6px;white-space:nowrap;">
                            ${formatScore(job.score)}/5
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#475569;">
                      ${escapeHtml(job.whyFit)}
                    </p>
                    ${
                      job.gaps
                        ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">${escapeHtml(job.gaps)}</p>`
                        : ""
                    }
                    <a href="${escapeHtml(job.url)}" style="display:inline-block;margin-top:12px;font-size:13px;font-weight:500;color:#2563eb;text-decoration:none;">
                      Apply →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
        })
        .join("");

      return `
      <tr>
        <td style="padding:24px 28px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <h2 style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${escapeHtml(company)}</h2>
              </td>
              <td align="right">
                <span style="font-size:12px;color:#94a3b8;">${jobs.length} role${jobs.length === 1 ? "" : "s"}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${jobRows}
          </table>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job matches</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 24px;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Your matches</p>
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#0f172a;line-height:1.3;">
                ${matches.length} role${matches.length === 1 ? "" : "s"} at ${companyCount} ${companyCount === 1 ? "company" : "companies"}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.5;">
                Roles that scored above your fit threshold, grouped by company.
              </p>
            </td>
          </tr>
          ${companySections}
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">careers-scraper</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailText(matches) {
  const groups = groupByCompany(matches);
  const header = `${matches.length} role${matches.length === 1 ? "" : "s"} at ${groups.length} ${groups.length === 1 ? "company" : "companies"}\n${"=".repeat(40)}\n`;

  const sections = groups.map(({ company, jobs }) => {
    const jobBlocks = jobs.map(
      (job) =>
        `  ${job.title}${job.location ? ` · ${job.location}` : ""} — ${formatScore(job.score)}/5
  ${job.whyFit}${job.gaps ? `\n  Note: ${job.gaps}` : ""}
  Apply: ${job.url}`
    );

    return `${company.toUpperCase()} (${jobs.length})\n${"-".repeat(40)}\n${jobBlocks.join("\n\n")}`;
  });

  return `${header}\n${sections.join("\n\n")}`;
}

export async function sendMatchEmail({ transporter, from, to, matches }) {
  if (matches.length === 0) return null;

  const groups = groupByCompany(matches);
  const subject =
    groups.length === 1
      ? `${matches.length} match${matches.length === 1 ? "" : "es"} at ${groups[0].company}`
      : `${matches.length} matches across ${groups.length} companies`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: buildEmailText(matches),
    html: buildEmailHtml(matches),
  });

  return info;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
