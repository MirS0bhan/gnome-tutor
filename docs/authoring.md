# Authoring content packs

GNOME Linux Academy lessons live in YAML modules under `content/<pack-id>/`. Each pack has a `pack.yaml` manifest and track subdirectories (`filesystem/`, `orientation/`, etc.).

## Pack manifest

```yaml
id: core
title: Core Curriculum
language: en
```

## Module shape

Every module file defines one lesson:

```yaml
track: filesystem
track_title: Files and the filesystem
module: opening-files
title: Opening Files (Nautilus)
order: 1
steps:
  - id: contrast-nautilus
    kind: contrast
    ...
```

## Four-beat pattern (Files track)

Filesystem modules use four steps:

1. **contrast** — Windows vs Linux mental model (`body`, optional `contrast_diagram`)
2. **gui** — Nautilus practice with `phases` (instruction card + optional spotlight)
3. **terminal** — VTE command with `validate.pattern`
4. **bridge** — tie GUI and terminal together

GUI steps need `target_app: org.gnome.Nautilus`, a `fixture` path relative to the pack root, and at least one `phases` entry with `instruction` and/or `label`.

## Step kinds

| Kind | Required fields |
|------|-----------------|
| `contrast` | `title`, `body` |
| `gui` | `instruction`, `target_app`; optional `fixture`, `phases`, `hints`, `spotlight` |
| `terminal` | `instruction`; optional `fixture`, `validate`, `distro_variants`, `hints` |
| `bridge` | `body` |
| `practice` | `instruction`; optional `fixture` |
| `challenge` | same as `terminal` |

## Fixtures

Reference fixtures with paths relative to the pack directory, e.g. `fixtures/open-files/`. Every referenced fixture directory must exist under `content/core/fixtures/` (or the localized pack). Keep fixtures minimal — a few text files are enough.

Run validation locally:

```bash
gjs -m tools/content-lint.js content
```

## Diagrams

SVG diagrams live in `content/core/diagrams/`. Use shapes and color only — **no embedded text** (labels are added by the app). Reference them from contrast steps:

```yaml
contrast_diagram: diagrams/home-not-c-drive.svg
```

## Distro variants

Terminal steps can branch on the learner's distro:

```yaml
distro_variants:
  debian:
    instruction: Run `apt search hello`.
    validate:
      pattern: '^apt\s+search\s+hello\s*$'
      expect_exit: 0
  fedora:
    instruction: Run `dnf search hello`.
    validate:
      pattern: '^dnf\s+search\s+hello\s*$'
      expect_exit: 0
  default:
    instruction: Run `apt search hello`.
    validate:
      pattern: '^apt\s+search\s+hello\s*$'
      expect_exit: 0
```

## Localization

Add a sibling pack (e.g. `core-fa/`) with the same `module` ids and translated text. Only override modules that differ; the app merges packs by language.

## Orientation track

Orientation modules explain the desktop without launching Shell (`org.gnome.Shell` is never a `target_app`). Use contrast and bridge steps; GUI beats may target Nautilus or Software where appropriate.

## CI

Pull requests run `gjs -m tools/content-lint.js content` and a Meson build. Fix schema or missing-fixture errors before merging.

Report lesson friction with the **Lesson feedback** issue template.

## Content pack split

See [content-packs.md](content-packs.md) for installing packs under `$XDG_DATA_DIRS` or using a separate repository.

## Optional GUI file watch

GUI steps may set `watch_file` (path relative to the sandbox) for soft auto-detection. The app shows a toast when the file changes; learners still press **Done** manually.

```yaml
watch_file: Documents/new-folder
```
