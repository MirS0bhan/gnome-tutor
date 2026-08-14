# Windows → GNOME Onboarding Extension

Contrast-anchored, task-triggered coach-marks for Windows switchers on their first GNOME session. This is **not** GNOME Tour: no modal walkthrough, no session-start lecture. Every hint fires on a real action or muscle-memory miss.

UUID: `windows-onboarding@urumlug.ir`  
Shell: GNOME 48–50 (ESM extension format, GNOME 45+ compatible)  
Source: `extension-windows-onboarding/`

This extension is **separate** from Linux Academy Spotlight (`linux-academy-spotlight@urumlug.ir`), which is a lesson-driven D-Bus overlay. If Spotlight owns its session bus name, this extension **yields** and shows no marks.

---

## 1. Audience and scope

**Persona — Reza.** Windows 10/11 power user; IT support technician; fluent in Settings, Control Panel, Task Manager, Explorer, and Win+X muscle memory. First boot into GNOME. Has not opened a terminal and will not. Did not read a manual. Mildly anxious about “breaking something.” Mildly annoyed that bottom-left, bottom-right, Win+E, and Win+I do not work.

**In scope.** Task-triggered Windows→GNOME contrast coach-marks on Shell chrome (panel, Overview, Dash, Quick Settings, workspaces, desktop, a few Windows shortcuts). Local GSettings only.

**Non-goals.**

- Not GNOME Tour and not a session-start slideshow.
- Not a terminal tutorial (Linux Academy VTE beats).
- Not app-replacement curriculum (File Explorer vs Files as a *lesson* lives in the content pack; this extension only rescues Win+E / desktop right-click at the Shell).
- Not Spotlight-for-lessons.
- No telemetry, network, or analytics.

---

## 2. Contrast map

Every required row is specified. Shipping may disable or merge a row; the spec still documents trigger, copy, and dismissal.

| id | User trigger | Windows | GNOME | Hint copy (max 2 sentences) | Dismissal |
|----|--------------|---------|-------|-----------------------------|-----------|
| `start-miss` | Pointer dwells in the **bottom-left** where Start used to be | Start menu | Activities / Super | Looking for the Start menu? It moved to the **top-left** corner — or press **Super** (the Windows key). | Esc, click-away, or Overview opens |
| `overview-first` | Overview actually opens (Super or top-left hot corner) | Start menu + taskbar | Activities Overview + Dash | This is your old Start menu and taskbar in one place. Type to launch apps; the icon row is your taskbar (only while Activities is open). | Esc or Overview hides |
| `taskbar-dash` | First Overview showing, Dash visible (merged into `overview-first` for shipping) | Taskbar | Dash in Overview | Your taskbar is this row of icons. It only appears in Activities — pin apps by right-clicking them here. | Esc / Overview hides |
| `tray-miss` | Pointer dwells in the **bottom-right** where the tray used to be | System tray | Quick Settings (top-right) | Wi-Fi, volume, and the clock moved to the **top-right**. Click there for what Windows called the system tray. | Esc / click-away |
| `quick-settings` | Quick Settings menu first opens | Tray overflow + Control Panel | Quick Settings + Settings gear | This menu replaces the system tray. The **gear** opens Settings (Windows Settings / Control Panel). | Esc / menu closes |
| `alttab-grouped` | First Alt+Tab switcher **closes** (not while it is up) | Alt+Tab | GNOME app switcher (grouped) | Same shortcut as Windows. Apps are grouped here; **Super+Tab** shows every window. | Esc / click-away |
| `window-controls` | Pointer first interacts with window chrome (titlebar grab) | Min / Max / Close | Close shown; Minimize often hidden | Close is here. Minimize is hidden by default — use Activities to get a window out of the way, or turn Minimize on in Settings → Windows. | Esc / click-away |
| `workspace-changed` | Workspace index changes **and** the previous workspace had windows | Virtual desktops | Workspaces | Your windows aren’t gone — you switched **workspaces** (virtual desktops). Super+Page Up goes back. | Esc / click-away |
| `explorer-shortcut` | **Super+E** (Win+E) | File Explorer | Files (Nautilus) | That’s the Windows File Explorer shortcut. Here the app is **Files** — opening it for you. Next time: Super, then type Files. | Esc / click-away |
| `desktop-context` | Right-click on the **wallpaper**, not on a window | Desktop icons / Personalize | Empty desktop; files in Files | The desktop isn’t a folder of icons here. Your files live in **Files** (Super, then type Files). | Esc / click-away |
| `settings-shortcut` | **Super+I** (Win+I) | Windows Settings | Settings app | That’s the Windows Settings shortcut. GNOME Settings is opening — you can also click the **gear** in the top-right menu. | Esc / click-away |

### 2.1 Reza revisions (named defects)

- **DEFECT A — session-start Overview lecture.** Firing `overview-first` at login violates rule 1. **Fix:** only on `'showing'` after a user-opened Overview.
- **DEFECT B — two hints for one Overview open.** Separate Taskbar→Dash stacks with Start→Overview. **Fix:** merge Dash copy into `overview-first`. Keep `taskbar-dash` in data, `defaultEnabled: false`.
- **DEFECT C — Alt+Tab overlay blocks the switch.** **Fix:** fire only after switcher destroy; **default off**.
- **DEFECT D — min/max on first window is Tour.** **Fix:** titlebar grab only; **default off**.
- **DEFECT E — tray-miss then quick-settings in one gesture.** **Fix:** skip `quick-settings` if `tray-miss` was shown in the last 60s.
- **DEFECT F — pointer already in the Start rect at login.** **Fix:** 400ms dwell **after enter**, not “currently inside at enable()”.
- **DEFECT G — Super grab.** Grabbing Super breaks Overview. **Fix:** never bind Super alone; use `Main.overview 'showing'`.
- **DEFECT H — full-screen dim.** **Fix:** ring + bubble only; `reactive: false` except close button.

**Shipped default (on):** `start-miss`, `overview-first`, `tray-miss`, `quick-settings` (de-duped), `workspace-changed`, `explorer-shortcut`, `settings-shortcut`, `desktop-context`.

**Shipped default (off):** `alttab-grouped`, `window-controls`, `taskbar-dash`.

**Anti-nag:** one mark at a time; 45s cooldown; persist `seen-hints`; yield to Spotlight.

---

## 3. Trigger mechanism

| id | Objects and signals |
|----|---------------------|
| `start-miss` | `global.stage` `captured-event` motion; Overview hidden; primary monitor bottom-left 48×48; 400ms dwell after enter. Anchor: `Main.panel.statusArea.activities`. |
| `overview-first` | `Main.overview` `'showing'` / `'hidden'`. Anchor Dash: `Main.overview.dash` or `Main.overview._overview?.controls?.dash`. |
| `taskbar-dash` | Same `'showing'`; disabled when merged. |
| `tray-miss` | Captured motion; bottom-right 48×48; Overview hidden. Anchor: `Main.panel.statusArea.quickSettings`. |
| `quick-settings` | `quickSettings.menu` `'open-state-changed'`. |
| `alttab-grouped` | `Main.uiGroup` `child-added` for switcher popups; fire on `destroy`. Pref `hint-alttab`. |
| `window-controls` | `global.display` `'grab-op-begin'` (titlebar move). Pref `hint-window-controls`. |
| `workspace-changed` | `global.workspace_manager` `'active-workspace-changed'`. Previous workspace had ≥1 normal window. Skip login snapshot. |
| `explorer-shortcut` | `Main.wm.addKeybinding` `<Super>e`. Launch Files. |
| `desktop-context` | Captured button-3 on wallpaper / background group, not windows or panel. |
| `settings-shortcut` | `addKeybinding` `<Super>i`. Launch Settings. |

**Shared gates:** master `enabled`; id not in `seen-hints`; optional pref for off-by-default ids; no mark visible; cooldown elapsed; Spotlight bus name not owned. Every `connect` in `try/catch`.

**Never:** hint from `enable()`; idle welcome; grab Super alone.

---

## 4. Visual pattern

- **CoachMark** on `Main.uiGroup`: non-reactive `St.Widget` ring (accent border) around target `get_transformed_position()` / `get_transformed_size()`, plus `St.BoxLayout` bubble (`St.Label` + close `St.Button`).
- Not a fixed modal. Not four dim shields (that is Spotlight / Tour-adjacent).
- Bubble: below-end of target; flip if it would clip `primaryMonitor`; 12px gap from the panel.
- Reposition on `monitors-changed` and target `notify::allocation`.
- Reduced motion: `St.Settings.get().enable_animations === false` → no ease.
- Destroy on dismiss, Overview `'hidden'` (overview-scoped hints), and `disable()`.

---

## 5. State and persistence

Schema `org.urumlug.WindowsOnboarding`:

| Key | Type | Default | Role |
|-----|------|---------|------|
| `enabled` | `b` | true | Master toggle |
| `seen-hints` | `as` | `[]` | Hint ids, written when shown |
| `hint-alttab` | `b` | false | Enable `alttab-grouped` |
| `hint-window-controls` | `b` | false | Enable `window-controls` |
| `win-explorer` | `as` | `['<Super>e']` | Keybinding |
| `win-settings` | `as` | `['<Super>i']` | Keybinding |

Prefs: master switch, “Replay all hints” (clears `seen-hints`), optional-hint switches. No network.

---

## 6. i18n

Gettext domain `windows-onboarding`. User-visible strings in `hints.js` and `prefs.js`. English source; Persian (`fa`) shipped for UrumLUG. `hints.js` has no Shell UI imports.

---

## 7. Accessibility

- Esc dismisses while a mark is visible; other keys are not stolen.
- Click-away dismisses without inhibiting the click (underlying UI still receives it).
- `accessible_name` on the bubble = Windows analog + GNOME analog.
- Reduced motion: §4.

---

## 8. File / module layout

```
extension-windows-onboarding/
  metadata.json
  extension.js
  prefs.js
  stylesheet.css
  hints.js
  coachMark.js
  triggers.js
  schemas/org.urumlug.WindowsOnboarding.gschema.xml
  po/
  meson.build
  install.sh
  README.md
```

Contributors add a row to `hints.js` and a hook in `triggers.js`. They do not edit D-Bus or lesson YAML.

---

## 9. Ship checklist

1. **No front-loaded Tour.** `enable()` does not show a mark. No timer from login. No “what is a workspace” before a workspace change.
2. **Windows word first.** Every string names the Windows analog before the GNOME term.
3. **One-shot, non-blocking.** Esc and click-away; ring `reactive: false`; `seen-hints` includes the id as soon as shown; Replay is the only reset.
4. **Local only.** No Soup, no HTTP, no analytics.
5. **Shell safety.** Every `connect` id stored; `disable()` disconnects, removes keybindings, removes timeouts, destroys actors, unwatches the bus name. All hooks in `try/catch`. Yield if Spotlight owns the bus.

### Manual test

- Bottom-left dwell → Start miss, points at Activities
- Super / hot corner → Overview + Dash copy
- Bottom-right dwell → tray miss
- Open Quick Settings within 60s of tray miss → no second mark
- Switch workspace with windows left behind → workspace hint
- Super+E → Files opens + Explorer copy
- Super+I → Settings opens + Settings copy
- Right-click wallpaper → desktop copy; right-click a window → no mark
- Esc and click-away dismiss; hint never returns until Replay
- Disable extension: no leftover actors or keybindings
