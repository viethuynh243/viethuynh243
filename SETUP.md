# Setup

This is the profile README repo. It must be named exactly `viethuynh243` —
GitHub renders the README of `<user>/<user>` on the profile page.

## 1. Create the repo and push

```bash
gh repo create viethuynh243 --public --source . --push
```

## 2. Add the token the workflows need

Both workflows read private-repo stats. Without a token they fall back to public only.

1. Create a **classic** PAT: https://github.com/settings/tokens/new
   Scopes: `repo`, `read:user`. Expiry: 1 year.
2. Add it as a repository secret named `METRICS_TOKEN`:
   https://github.com/viethuynh243/viethuynh243/settings/secrets/actions

Do not paste the token into a file or a chat — only into that settings page.

## 3. Run the workflows once

Actions tab → **Metrics** → Run workflow. Then **3D contribution calendar** → Run workflow.

They commit two artifacts back to this repo, which the README embeds:

| File | Produced by |
|---|---|
| `github-metrics.svg` | `.github/workflows/metrics.yml` |
| `profile-3d-contrib/profile-night-green.svg` | `.github/workflows/profile-3d.yml` |

Until the first run finishes, those two images show as broken. That is expected.

## Editing

- **Project tables** — `README.md`, four tables under `## Work`. Private entries carry 🔒
  and no link, because a link to a private repo 404s for visitors.
- **Commit counts** — measured from local working copies on 2026-08-01. Re-measure with
  `git rev-list --count HEAD` before changing them.
- **Language chart** — generated, not hand-written. Adjust `plugin_languages_ignored`
  in `metrics.yml` rather than editing numbers.

## Deliberately excluded

Reverse-engineering work (`Response2000-RE`, `spColumn-RE`) and `security-lab` are kept
off the profile. Their capability shows up under **What I bring** as
"Binary & format analysis" — skill named, repos not.
