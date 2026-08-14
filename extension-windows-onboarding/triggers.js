/* triggers.js
 *
 * Shell signal hookup. Reza's first-person notes sit above each hook so
 * contributors know *why* a hint fires, not only what it connects to.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const CORNER = 48;
const DWELL_MS = 400;
const TRAY_QUICK_DEDUPE_MS = 60000;

function primaryMonitor() {
    return Main.layoutManager.primaryMonitor;
}

function inRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function workspaceWindowCount(index) {
    try {
        const workspace = global.workspace_manager.get_workspace_by_index(index);
        if (!workspace)
            return 0;
        return workspace.list_windows().filter(win =>
            win.get_window_type() === Meta.WindowType.NORMAL && !win.is_skip_taskbar()
        ).length;
    } catch {
        return 0;
    }
}

function dashActor() {
    return Main.overview?.dash
        ?? Main.overview?._overview?.controls?.dash
        ?? null;
}

function activitiesActor() {
    return Main.panel?.statusArea?.activities ?? Main.panel;
}

function quickSettingsActor() {
    return Main.panel?.statusArea?.quickSettings ?? Main.panel;
}

function actorAtPointerIsDesktop(x, y) {
    try {
        const actor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);
        if (!actor)
            return true;
        if (actor instanceof Meta.WindowActor)
            return false;
        let current = actor;
        while (current) {
            if (current === Main.panel)
                return false;
            if (current === Main.layoutManager._backgroundGroup)
                return true;
            current = current.get_parent();
        }
        return actor === global.stage;
    } catch {
        return false;
    }
}

export class TriggerHost {
    constructor(controller) {
        this._c = controller;
        this._corner = null;
        this._dwellId = 0;
        this._lastWorkspaceIndex = 0;
        this._lastWorkspaceWindows = 0;
        this._trayMissAt = 0;
    }

    bind() {
        this._bindPointerCorners();
        this._bindOverview();
        this._bindQuickSettings();
        this._bindWorkspaces();
        this._bindKeybindings();
        this._bindDesktopContext();
        this._bindAltTab();
        this._bindWindowControls();
        this._bindEscapeAndClickAway();
    }

    unbind() {
        if (this._dwellId) {
            GLib.source_remove(this._dwellId);
            this._dwellId = 0;
        }
        this._corner = null;
        try {
            Main.wm.removeKeybinding('win-explorer');
        } catch {
            // not registered
        }
        try {
            Main.wm.removeKeybinding('win-settings');
        } catch {
            // not registered
        }
    }

    _bindPointerCorners() {
        /*
         * Reza: "I rammed the pointer into the bottom-left. No Start.
         * Did I break the desktop?"
         *
         * He sees a ring on Activities (top-left), not a fake Start button
         * on empty pixels. Rescue, not a login splash.
         *
         * DEFECT F: if we fire because the cursor was already in that
         * corner at enable(), this is Tour. Require 400ms dwell AFTER enter.
         */
        this._c.connect(
            global.stage,
            'captured-event',
            (_actor, event) => this._onCapturedEvent(event),
        );
    }

    _onCapturedEvent(event) {
        const type = event.type();

        if (type === Clutter.EventType.MOTION)
            this._onMotion(event);

        if (type === Clutter.EventType.BUTTON_PRESS)
            this._onButtonPress(event);

        if (type === Clutter.EventType.KEY_PRESS && event.get_key_symbol() === Clutter.KEY_Escape)
            this._c.dismissFromEscape();

        return Clutter.EVENT_PROPAGATE;
    }

    _onMotion(event) {
        if (Main.overview.visible) {
            this._clearDwell();
            return;
        }

        const [x, y] = event.get_coords();
        const monitor = primaryMonitor();
        if (!monitor)
            return;

        const startRect = {
            id: 'start-miss',
            x: monitor.x,
            y: monitor.y + monitor.height - CORNER,
            w: CORNER,
            h: CORNER,
            anchor: () => activitiesActor(),
        };
        const trayRect = {
            id: 'tray-miss',
            x: monitor.x + monitor.width - CORNER,
            y: monitor.y + monitor.height - CORNER,
            w: CORNER,
            h: CORNER,
            anchor: () => quickSettingsActor(),
        };

        const hit = [startRect, trayRect].find(rect => inRect(x, y, rect.x, rect.y, rect.w, rect.h));
        if (!hit) {
            this._clearDwell();
            return;
        }
        if (this._corner === hit.id)
            return;

        this._clearDwell();
        this._corner = hit.id;
        this._dwellId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DWELL_MS, () => {
            this._dwellId = 0;
            if (this._corner !== hit.id || Main.overview.visible)
                return GLib.SOURCE_REMOVE;
            const shown = this._c.tryShow(hit.id, hit.anchor());
            if (shown && hit.id === 'tray-miss')
                this._trayMissAt = GLib.get_monotonic_time() / 1000;
            return GLib.SOURCE_REMOVE;
        });
    }

    _clearDwell() {
        this._corner = null;
        if (this._dwellId) {
            GLib.source_remove(this._dwellId);
            this._dwellId = 0;
        }
    }

    _bindOverview() {
        /*
         * Reza: "I hit the Windows key. The whole desktop dimmed. Is this Start?"
         *
         * Ring on the Dash. Copy names Start and taskbar first (DEFECT A/B:
         * no login splash, no second Dash-only bubble).
         *
         * DEFECT G: never grab Super alone — Overview 'showing' is the signal.
         */
        this._c.connect(Main.overview, 'showing', () => {
            this._clearDwell();
            this._c.dismissIfScoped('overview');
            this._c.tryShow('overview-first', dashActor() ?? activitiesActor());
        });
        this._c.connect(Main.overview, 'hidden', () => {
            this._c.dismissIfScoped('overview');
        });
    }

    _bindQuickSettings() {
        /*
         * Reza: "I found the top-right and clicked. Looks like the hidden tray."
         *
         * Gear = Settings / Control Panel.
         * DEFECT E: skip if tray-miss was shown in the last 60s.
         */
        const qs = Main.panel?.statusArea?.quickSettings;
        const menu = qs?.menu;
        if (!menu)
            return;
        this._c.connect(menu, 'open-state-changed', (_menu, open) => {
            if (!open)
                return;
            const now = GLib.get_monotonic_time() / 1000;
            if (this._trayMissAt && now - this._trayMissAt < TRAY_QUICK_DEDUPE_MS)
                return;
            this._c.tryShow('quick-settings', quickSettingsActor());
        });
    }

    _bindWorkspaces() {
        /*
         * Reza: "All my windows vanished. I broke it."
         *
         * This is the rejection-driver hint. Do not fire on the login
         * workspace notify — snapshot first, require windows left behind.
         */
        const manager = global.workspace_manager;
        this._lastWorkspaceIndex = manager.get_active_workspace_index();
        this._lastWorkspaceWindows = workspaceWindowCount(this._lastWorkspaceIndex);

        this._c.connect(manager, 'active-workspace-changed', () => {
            const prevIndex = this._lastWorkspaceIndex;
            const prevCount = this._lastWorkspaceWindows;
            const next = manager.get_active_workspace_index();
            this._lastWorkspaceIndex = next;
            this._lastWorkspaceWindows = workspaceWindowCount(next);
            if (next === prevIndex)
                return;
            if (prevCount < 1)
                return;
            this._c.tryShow('workspace-changed', Main.panel);
        });
    }

    _bindKeybindings() {
        /*
         * Reza: "Win+E. Silence. Where is Explorer?"
         * Rescue by opening Files, then a two-sentence contrast.
         */
        try {
            Main.wm.addKeybinding(
                'win-explorer',
                this._c.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => {
                    this._launchFiles();
                    this._c.tryShow('explorer-shortcut', activitiesActor());
                },
            );
        } catch (error) {
            console.warn(`windows-onboarding: explorer keybinding: ${error.message}`);
        }

        /*
         * Reza: "Win+I. Silence."
         * Rescue by opening Settings; mention the top-right gear.
         */
        try {
            Main.wm.addKeybinding(
                'win-settings',
                this._c.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => {
                    this._launchSettings();
                    this._c.tryShow('settings-shortcut', quickSettingsActor());
                },
            );
        } catch (error) {
            console.warn(`windows-onboarding: settings keybinding: ${error.message}`);
        }
    }

    _launchFiles() {
        try {
            const home = GLib.filename_to_uri(GLib.get_home_dir(), null);
            Gio.AppInfo.launch_default_for_uri(home, null);
        } catch (error) {
            console.warn(`windows-onboarding: launch Files: ${error.message}`);
        }
    }

    _launchSettings() {
        const ids = ['org.gnome.Settings.desktop', 'gnome-control-center.desktop'];
        for (const id of ids) {
            try {
                const app = Gio.DesktopAppInfo?.new?.(id);
                if (app) {
                    app.launch([], null);
                    return;
                }
            } catch {
                // try next
            }
        }
        try {
            Gio.AppInfo.create_from_commandline(
                'gnome-control-center',
                'Settings',
                Gio.AppInfoCreateFlags.NONE,
            )?.launch([], null);
        } catch (error) {
            console.warn(`windows-onboarding: launch Settings: ${error.message}`);
        }
    }

    _bindDesktopContext() {
        /*
         * Reza: "Right-click desktop for Personalize / New Folder."
         * Wallpaper only — not windows, not the panel.
         */
    }

    _onButtonPress(event) {
        const [x, y] = event.get_coords();
        if (this._c.markVisible && !this._c.markContains(x, y))
            this._c.dismissFromClickAway();

        if (event.get_button() !== Clutter.BUTTON_SECONDARY)
            return;

        if (Main.overview.visible)
            return;

        if (!actorAtPointerIsDesktop(x, y))
            return;

        this._c.tryShow('desktop-context', activitiesActor());
    }

    _bindAltTab() {
        /*
         * Reza: "Alt+Tab — it works? Apps are stacked weird."
         *
         * DEFECT C: a bubble during the switcher is an interruption.
         * Fire only after the popup is destroyed. Default off.
         */
        this._c.connect(Main.uiGroup, 'child-added', (_group, child) => {
            try {
                const name = child?.constructor?.name ?? '';
                const style = child?.style_class ?? '';
                const looksLikeSwitcher = name.includes('Switcher')
                    || style.includes('switcher-popup')
                    || style.includes('switcher-list');
                if (!looksLikeSwitcher)
                    return;
                this._c.connect(child, 'destroy', () => {
                    this._c.tryShow('alttab-grouped', Main.panel);
                });
            } catch {
                // Shell internals differ by version
            }
        });
    }

    _bindWindowControls() {
        /*
         * Reza: "Where is Minimize? I only see Close."
         *
         * DEFECT D: first mapped window at login is Tour.
         * Optional: titlebar grab-op only.
         */
        this._c.connect(global.display, 'grab-op-begin', (_display, window, op) => {
            try {
                const moving = Meta.GrabOp.MOVING !== undefined && op === Meta.GrabOp.MOVING;
                if (!moving && op !== 1)
                    return;
                if (!window)
                    return;
                this._c.tryShow('window-controls', Main.panel);
            } catch {
                // GrabOp enum may differ
            }
        });
    }

    _bindEscapeAndClickAway() {
        // Escape and click-away are handled in captured-event so they never
        // steal the underlying click (EVENT_PROPAGATE).
    }
}
