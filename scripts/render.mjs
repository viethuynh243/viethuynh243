#!/usr/bin/env node
// render.mjs — turns data/stats.json + data/projects.json into everything a human sees.
// Runs with NO token, so you can preview locally after editing prose:
//     node scripts/render.mjs
// It (1) computes a `display` block and writes it back into stats.json (the site reads it),
//    (2) rewrites assets/activity.svg from the numbers,
//    (3) injects the Work section into README.md between the STATS markers.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rd = async (p) => JSON.parse(await readFile(resolve(ROOT, p), "utf8"));

const cfg = await rd("data/config.json");
const projects = await rd("data/projects.json");
const stats = await rd("data/stats.json");
const repos = stats.repos || {};

const missing = [];
const flat = [];
for (const g of projects.groups) for (const p of g.projects) {
  const s = repos[p.repo];
  if (!s) missing.push(`${p.owner || cfg.login}/${p.repo}`);
  flat.push({ ...p, mine: s?.mine ?? null, total: s?.total ?? null });
}
if (missing.length) {
  console.warn("No stats for: " + missing.join(", "));
  console.warn("Available repo names: " + Object.keys(repos).sort().join(", "));
  console.warn("Fix the `repo`/`owner` fields in data/projects.json to match, then re-run.");
}

// ---- display block (used by the site + README total line) ----
const totalCommits = flat.reduce((a, p) => a + (p.mine || 0), 0);
const activity = flat
  .filter((p) => p.mine)
  .sort((a, b) => b.mine - a.mine)
  .slice(0, 8)
  .map((p) => ({ display: p.display, mine: p.mine }));
const maxMine = activity[0]?.mine || 1;

stats.display = {
  repoCount: stats.repoCount ?? Object.keys(repos).length,
  totalCommits,
  languageCount: (stats.languages || []).length,
  activeSince: cfg.activeSince,
  activity: activity.map((a) => ({ ...a, pct: +((a.mine / maxMine) * 100).toFixed(1) })),
};
await writeFile(resolve(ROOT, "data/stats.json"), JSON.stringify(stats, null, 2) + "\n");

// ---- assets/activity.svg : clean, static, data-driven bar chart ----
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const W = 1200, rowH = 30, padT = 54, padL = 210, padR = 90, barMax = W - padL - padR;
const H = padT + activity.length * rowH + 20;
const label = "Commits I authored per repository: " + activity.map((a) => `${a.display} ${a.mine}`).join(", ");
const rows = activity.map((a, i) => {
  const y = padT + i * rowH;
  const w = Math.max(3, Math.round((a.mine / maxMine) * barMax));
  return `  <text x="${padL - 12}" y="${y + 15}" text-anchor="end" class="nm">${esc(a.display)}</text>
  <rect x="${padL}" y="${y + 4}" width="${w}" height="16" rx="2" fill="url(#hatch)" stroke="#0b57d0" stroke-width=".8"/>
  <text x="${padL + w + 8}" y="${y + 15}" class="val">${a.mine}</text>`;
}).join("\n");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
<defs>
  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#e6ecf5" stroke-width=".8"/></pattern>
  <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#eaf1fd"/><rect width="1.6" height="6" fill="#0b57d0"/></pattern>
  <style>.ttl{font:600 20px 'Segoe UI',system-ui,sans-serif;fill:#111927}.nm{font:500 14px 'Segoe UI',system-ui,sans-serif;fill:#3a4658}.val{font:600 13px 'Roboto Mono',ui-monospace,monospace;fill:#0b57d0}</style>
</defs>
<rect width="${W}" height="${H}" fill="#ffffff"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<text x="24" y="34" class="ttl">Commits I authored, by repository</text>
${rows}
</svg>
`;
await writeFile(resolve(ROOT, "assets/activity.svg"), svg);

// ---- README.md : inject the Work section between markers ----
const readmePath = resolve(ROOT, "README.md");
let readme = await readFile(readmePath, "utf8");
const START = "<!-- STATS:START -->", END = "<!-- STATS:END -->";

const tbl = (rowsMd) => `| Project | What it does | Stack | My commits |\n|---|---|---|:--:|\n${rowsMd}`;
const cell = (p) => {
  const name = p.link ? `[**${p.display}**](${p.link})` : `**${p.display}**${p.private ? " 🔒" : ""}`;
  let n = "—";
  if (p.mine != null) n = p.total && p.total !== p.mine ? `**${p.mine}** of ${p.total}` : `**${p.mine}**`;
  return `| ${name} | ${p.desc} | ${p.stack} | ${n} |`;
};
let body = `I authored **${totalCommits.toLocaleString("en-US")}** commits across the repositories below` +
  `, last refreshed ${stats.generatedAt}. Where a repository has several contributors, the count is mine alone. ` +
  `🔒 marks a private repository.\n`;
for (const g of projects.groups) {
  body += `\n### ${g.title}\n\n` + tbl(g.projects.map((p) => {
    const s = repos[p.repo];
    return cell({ ...p, mine: s?.mine ?? null, total: s?.total ?? null });
  }).join("\n")) + "\n";
}
const block = `${START}\n<!-- Generated by scripts/render.mjs from data/stats.json — do not edit by hand. -->\n\n${body}\n${END}`;

if (readme.includes(START) && readme.includes(END)) {
  readme = readme.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
} else {
  console.warn("STATS markers not found in README.md — appending a Work section. Move it where you want it.");
  readme += `\n\n## Work\n\n${block}\n`;
}
await writeFile(readmePath, readme);

console.log(`Rendered: ${totalCommits.toLocaleString("en-US")} commits, ${activity.length} bars, ${stats.display.languageCount} languages.`);
