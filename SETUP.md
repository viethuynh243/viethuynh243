# Setup

This is the profile README repo. It must stay named exactly `viethuynh243`, because
GitHub renders the README of `<user>/<user>` on the profile page.

## 1. Add the token the workflow needs

The Metrics workflow reads private-repo data. Without a token it fails outright.

1. Create a **classic** PAT at https://github.com/settings/tokens/new with scopes `repo`
   and `read:user`. One year expiry works.
2. Save it as a repository secret named `METRICS_TOKEN` at
   https://github.com/viethuynh243/viethuynh243/settings/secrets/actions

Paste it straight into that settings page. Never put it in a file, a commit, or a chat.

## 2. Run the workflow once

Actions → **Metrics** → Run workflow. It runs two jobs:
- `metrics` — the four cards (overview, languages, achievements, topics).
- `stats` — the live numbers (see below). Runs after `metrics`.

## Live numbers — one source of truth

Every commit count and language percentage comes from **`data/stats.json`**, regenerated
nightly by the `stats` job. Nothing is typed by hand anymore, so a number can no longer
drift between the README, the SVGs and the personal site.

```
metrics.yml (nightly)
  └─ node scripts/collect-stats.mjs   → data/stats.json   (GitHub GraphQL: commits + languages)
  └─ node scripts/render.mjs          → injects README between the STATS markers
                                        → regenerates assets/activity.svg
viethuynh243.github.io/index.html  fetches data/stats.json at page load
```

| File | Role | Edit by hand? |
|---|---|---|
| `data/config.json` | who counts as me (`authorEmails`), language filter, `activeSince` | **yes** |
| `data/projects.json` | project prose: name, description, stack, `repo`, `owner`, `private`, `link` | **yes** |
| `data/stats.json` | the live numbers | **no** — generated |
| README `## Work` block | rendered table between `<!-- STATS:START/END -->` | **no** — generated |
| `assets/activity.svg` | commit bar chart | **no** — generated |

### To change a project's description or stack
Edit `data/projects.json`, then either push (the nightly job re-renders) or run
`node scripts/render.mjs` locally and commit. `render.mjs` needs no token.

### To fix a commit count that looks wrong
Do **not** edit a number. Either:
- the count excludes commits made under an unlisted email → add that email to
  `authorEmails` in `data/config.json`; or
- a project's `repo`/`owner` in `projects.json` does not match a real repo → `render.mjs`
  prints the available repo names; correct the field. Unmatched projects render `—`.

### Counting method (know this)
`mine` = commits on a repo's **default branch** whose author email is in `authorEmails`.
`total` = all commits on the default branch. This counts default-branch only, so it can
differ slightly from an all-branches `git rev-list --all` count. Grand total = sum of
`mine` across the projects listed in `projects.json`.

### Why the public contribution calendar was removed
The isometric calendar, the 3D calendar and the snake all draw the **public** contribution
graph, which is sparse because most work is in private repos and some commits were authored
under emails not linked to this account. They made an active profile look idle. To fill the
real graph instead, add those emails at
https://github.com/settings/emails and enable *Include private contributions on my profile*.

## Generated files

| File | Produced by |
|---|---|
| `metrics.overview.svg`, `metrics.languages.svg`, `metrics.achievements.svg`, `metrics.topics.svg` | `.github/workflows/metrics.yml` (job `metrics`) |
| `data/stats.json`, `assets/activity.svg`, README `## Work` block | `.github/workflows/metrics.yml` (job `stats`) |

## Hand-drawn assets

| File | What it is |
|---|---|
| `assets/hero.svg` | Animated banner: cable-stayed bridge under construction. |
| `assets/divider.svg` | Road-plan strip between sections. |

Both honour `prefers-reduced-motion`.

## Deliberately excluded

Reverse-engineering repositories (`Response2000-RE`, `spColumn-RE`) and `security-lab` stay
off the profile. Their capability still shows under **Security** and **What I bring**: the
skill is named, the repositories are not.
