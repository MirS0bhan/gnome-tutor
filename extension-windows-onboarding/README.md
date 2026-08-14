# Windows to GNOME Coach

GNOME Shell extension that shows **Windows → GNOME** coach-marks only when a Windows habit fails (bottom-left Start, Win+E, workspace switch, …). It is not GNOME Tour and not Linux Academy Spotlight.

See [docs/WINDOWS-ONBOARDING.md](../docs/WINDOWS-ONBOARDING.md) for the spec.

## Install

```bash
./install.sh
gnome-extensions enable windows-onboarding@urumlug.ir
```

Then log out and back in (or `Alt+F2` → `r` on X11).

Preferences: Extensions → Windows to GNOME Coach. **Replay all hints** clears seen state. Optional Alt+Tab and window-control hints stay off by default.

## Edit copy

User-visible hint text lives in `hints.js`. Trigger timing lives in `triggers.js` (Reza comments explain why each hook fires). Do not add session-start hints.
