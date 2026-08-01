# Setup

This is the profile README repo. It must stay named exactly `viethuynh243`, because
GitHub renders the README of `<user>/<user>` on the profile page.

## 1. Add the token the workflows need

Both workflows read private-repo data. Without a token, Metrics fails outright and the 3D
calendar counts public contributions only.

1. Create a **classic** PAT at https://github.com/settings/tokens/new with scopes `repo`
   and `read:user`. Set an expiry you will remember, one year works.
2. Save it as a repository secret named `METRICS_TOKEN` at
   https://github.com/viethuynh243/viethuynh243/settings/secrets/actions

Paste the token straight into that settings page. Do not put it in a file, a commit, or a chat.

## 2. Run the workflows once

Actions tab, then **Metrics**, then Run workflow. Then **3D contribution calendar**, Run workflow.

## 3. Switch on the metrics cards

Once Metrics has run green, open `README.md`, find the block that starts
`<!-- METRICS CARDS.` and delete that opening marker plus its closing `-->`.
Six cards appear: overview, isometric calendar, languages in depth, coding habits,
achievements, topics.

## Generated files

| File | Produced by |
|---|---|
| `metrics.overview.svg`, `metrics.isocalendar.svg`, `metrics.languages.svg`, `metrics.habits.svg`, `metrics.achievements.svg`, `metrics.topics.svg` | `.github/workflows/metrics.yml` |
| `profile-3d-contrib/*.svg` | `.github/workflows/profile-3d.yml` |

Everything under `assets/` is hand-drawn and committed, not generated.

## Hand-drawn assets

| File | What it is |
|---|---|
| `assets/hero.svg` | Animated banner: cable-stayed bridge under construction, city skyline, crawler crane, traffic, barge. Cables draw themselves in on a loop. |
| `assets/divider.svg` | Road plan strip used between sections. Lane markings run, a roller crosses. |
| `assets/activity.svg` | Commits I authored per repository, drawn as a skyline that builds itself. Height uses a square-root scale so small repositories stay readable, and every bar carries its real number. |
| `assets/languages.svg` | Stacked language bar plus a full legend. Every language is named, nothing is rolled into an "other" bucket. |

All four honour `prefers-reduced-motion`, so animation stops for readers who ask for that.

## Editing

- **Project tables** live under `## Work` in `README.md`. Private entries carry 🔒 and no
  link, because a link to a private repo shows a 404 to visitors.
- **Commit counts** are commits I authored, not repository totals. Re-measure with
  `git rev-list --count --all --author='viethuynh243'` before changing a number.
- **Language percentages** are baked into `assets/languages.svg`. If you recount, update the
  bar widths, the legend percentages and the total in the caption together.

## Deliberately excluded

Reverse-engineering repositories (`Response2000-RE`, `spColumn-RE`) and `security-lab` stay
off the profile. Their capability still shows up under **What I bring** and **Security**:
the skill is named, the repositories are not.
