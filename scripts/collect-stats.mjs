#!/usr/bin/env node
// collect-stats.mjs — the ONLY step that talks to GitHub. Produces data/stats.json.
//
// What it counts:
//   repos.<name>.mine  = commits on the default branch whose author email is in
//                        config.authorEmails (so commits made under an email not
//                        linked to your account still count).
//   repos.<name>.total = all commits on the default branch (for the "N of M" split).
//   languages          = bytes per language across your OWNER repos, prose filtered.
//
// It queries (a) every non-fork repo you OWN, plus (b) any repo named in
// data/projects.json that you do NOT own (e.g. a team repo under `owner: manh354`),
// so cross-owner contributions are still counted.
//
// Needs env METRICS_TOKEN (or GH_TOKEN): a classic PAT with `repo` + `read:user`.
// Node 18+ (global fetch). No npm install.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.METRICS_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error("Missing METRICS_TOKEN / GH_TOKEN"); process.exit(1); }

const cfg = JSON.parse(await readFile(resolve(ROOT, "data/config.json"), "utf8"));
const projects = JSON.parse(await readFile(resolve(ROOT, "data/projects.json"), "utf8"));
const ignore = new Set((cfg.ignoreLanguages || []).map((s) => s.toLowerCase()));

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error("GraphQL: " + JSON.stringify(json.errors));
  return json.data;
}

// Fragment shared by both queries: commit counts (mine vs all) + languages for one repo.
const REPO_FIELDS = `
  name
  isPrivate
  url
  defaultBranchRef { target { ... on Commit {
    mine: history(author: { emails: $emails }) { totalCount }
    all:  history { totalCount }
  } } }
  languages(first: 30, orderBy: { field: SIZE, direction: DESC }) {
    edges { size node { name color } }
  }`;

const repos = {};        // name -> {mine,total,private,url}
const langBytes = {};     // "Name" -> {bytes, color}

// Only these repos count toward the language mix, so third-party clones/forks kept in the
// account (cherry-studio, MinerU, …) cannot pollute it. Commit counts are collected for
// every repo regardless; languages are curated to the projects you actually list.
const projectRepoNames = new Set(projects.groups.flatMap((g) => g.projects.map((p) => p.repo)));

function absorb(node) {
  if (!node) return;
  const t = node.defaultBranchRef?.target;
  repos[node.name] = {
    mine: t?.mine?.totalCount ?? 0,
    total: t?.all?.totalCount ?? 0,
    private: !!node.isPrivate,
    url: node.url,
  };
  if (!projectRepoNames.has(node.name)) return;   // languages: projects only
  for (const e of node.languages?.edges || []) {
    const nm = e.node?.name;
    if (!nm || ignore.has(nm.toLowerCase())) continue;
    const rec = (langBytes[nm] ||= { bytes: 0, color: e.node.color || "#888888" });
    rec.bytes += e.size || 0;
  }
}

// (a) All OWNER, non-fork repos — paginated.
const OWNER_Q = `
  query($login:String!, $emails:[String!]!, $cursor:String) {
    user(login:$login) {
      repositories(first:50, after:$cursor, ownerAffiliations:[OWNER], isFork:false,
                   orderBy:{field:PUSHED_AT, direction:DESC}) {
        pageInfo { hasNextPage endCursor }
        nodes { ${REPO_FIELDS} }
      }
    }
  }`;
let cursor = null;
let ownerCount = 0;
do {
  const data = await gql(OWNER_Q, { login: cfg.login, emails: cfg.authorEmails, cursor });
  const conn = data.user.repositories;
  conn.nodes.forEach(absorb);
  ownerCount += conn.nodes.length;
  cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
} while (cursor);
console.log(`Owner repos collected: ${ownerCount}`);

// (b) Any project repo owned by someone else — fetch individually.
const REPO_Q = `
  query($owner:String!, $name:String!, $emails:[String!]!) {
    repository(owner:$owner, name:$name) { ${REPO_FIELDS} }
  }`;
const wanted = [];
for (const g of projects.groups) for (const p of g.projects) {
  const owner = p.owner || cfg.login;
  if (owner !== cfg.login && !repos[p.repo]) wanted.push({ owner, name: p.repo });
}
for (const w of wanted) {
  try {
    const data = await gql(REPO_Q, { owner: w.owner, name: w.name, emails: cfg.authorEmails });
    if (data.repository) absorb(data.repository);
    else console.warn(`  ! ${w.owner}/${w.name}: not visible to this token`);
  } catch (e) { console.warn(`  ! ${w.owner}/${w.name}: ${e.message}`); }
}

// Languages -> sorted percentages.
const totalBytes = Object.values(langBytes).reduce((a, r) => a + r.bytes, 0) || 1;
const languages = Object.entries(langBytes)
  .map(([name, r]) => ({ name, color: r.color, bytes: r.bytes, pct: +((r.bytes / totalBytes) * 100).toFixed(2) }))
  .sort((a, b) => b.bytes - a.bytes);

// generatedAt without Date.now-in-a-workflow concerns: use the runner's date via env if present.
const stamp = (process.env.STATS_DATE || new Date().toISOString()).slice(0, 10);

const out = { generatedAt: stamp, repoCount: ownerCount, repos, languages };
await mkdir(resolve(ROOT, "data"), { recursive: true });
await writeFile(resolve(ROOT, "data/stats.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote data/stats.json — ${Object.keys(repos).length} repos, ${languages.length} languages.`);
