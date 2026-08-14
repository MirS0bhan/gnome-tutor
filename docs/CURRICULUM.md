# Curriculum overview

GNOME Linux Academy teaches Linux through a **four-beat pattern** repeated in every module:

1. **Contrast** — what you are used to (Windows/macOS) vs Linux/GNOME
2. **GUI** — practice in a real app (Files, Settings, …) with an instruction card and optional Spotlight extension
3. **Terminal** — same task in an in-app VTE sandbox with regex validation
4. **Bridge** — connect the two approaches in plain language

## Tracks

| Track | Topic | Pattern notes |
|-------|--------|----------------|
| 0 Orientation | Desktop basics | Contrast + **tour** (Spotlight on Shell UI); no terminal |
| 1 Filesystem | Files & paths | Full four-beat; filesystem modules lint-checked |
| 2 Permissions | chmod, execute | Nautilus Properties + terminal |
| 3 Software | Software + package managers | Includes one **real-system** terminal step (`sandbox: false`) |
| 4 Processes | System Monitor | Spawns `academy-dummy-process` for kill practice |
| 5 Settings | gsettings / Background | Settings app + `gsettings get` |
| 6 Editing | Text Editor | GUI edit + `cat` / nano intro |
| 7 Devices | Disks | Disks app + `lsblk` / `df` |
| 8 Networking | IP addresses | Settings Network + `ip a` |
| 9 Practice | Free sandbox | Persistent folder + optional challenge dropdown |

## Step kinds

| Kind | Purpose |
|------|---------|
| `contrast` | Two-column intro (`body_left` / `body_right` optional) |
| `gui` | Launch `target_app`, phases, optional `validate.exists` |
| `tour` | Spotlight-only desktop walkthrough (no app launch) |
| `terminal` | VTE sandbox; `validate.pattern` + `__LA:` sentinel |
| `bridge` | Summary text |
| `practice` | Persistent sandbox; optional `challenges[]` |
| `challenge` | One-shot validated terminal task |

## Validation

Terminal validation is **advisory**. Learners can use **Skip validation** if their correct command does not match the regex.

## Spotlight extension

Optional Shell extension (`extension/`) exposes D-Bus methods for window/region highlights. Lessons work fully without it via text instructions.

A separate first-session extension (`extension-windows-onboarding/`, `windows-onboarding@urumlug.ir`) shows Windows→GNOME coach-marks on real friction (not on login). It yields while Spotlight is highlighting a lesson. See [WINDOWS-ONBOARDING.md](WINDOWS-ONBOARDING.md).

## Content layout

```
content/<pack>/
  pack.yaml
  <track>/<module>.yaml
  fixtures/
  diagrams/
```

Validate with:

```bash
gjs -m tools/content-lint.js content
gjs -m tools/check-gresource.js
```
