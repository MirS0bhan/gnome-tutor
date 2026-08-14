/* extension.js
 *
 * Windows → GNOME contrast coach-marks. No Tour. No telemetry.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {CoachMark} from './coachMark.js';
import {getHint, getHints} from './hints.js';
import {TriggerHost} from './triggers.js';

const SPOTLIGHT_BUS_NAME = 'systems.misano.LinuxAcademy.Spotlight';
const COOLDOWN_MS = 45000;

export default class WindowsOnboardingExtension extends Extension {
    enable() {
        this._signals = [];
        this._timeouts = [];
        this._watchId = 0;
        this._spotlightOwned = false;
        this._lastShownAt = 0;
        this._activeHint = null;
        this._hints = getHints(_);
        this._settings = this.getSettings();
        this._mark = new CoachMark();
        this._triggers = new TriggerHost(this);

        this._watchId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            SPOTLIGHT_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            () => {
                this._spotlightOwned = true;
                this._mark.dismiss(false);
            },
            () => {
                this._spotlightOwned = false;
            },
        );

        try {
            this._triggers.bind();
        } catch (error) {
            console.warn(`windows-onboarding: bind failed: ${error.message}`);
        }
    }

    disable() {
        try {
            this._triggers?.unbind();
        } catch (error) {
            console.warn(`windows-onboarding: unbind failed: ${error.message}`);
        }
        this._triggers = null;

        try {
            this._mark?.destroy();
        } catch {
            // already destroyed
        }
        this._mark = null;

        for (const [obj, id] of this._signals) {
            try {
                obj.disconnect(id);
            } catch {
                // actor already gone
            }
        }
        this._signals = [];

        for (const id of this._timeouts) {
            try {
                GLib.source_remove(id);
            } catch {
                // already removed
            }
        }
        this._timeouts = [];

        if (this._watchId) {
            Gio.bus_unwatch_name(this._watchId);
            this._watchId = 0;
        }

        this._settings = null;
        this._hints = [];
        this._activeHint = null;
    }

    get settings() {
        return this._settings;
    }

    get markVisible() {
        return this._mark?.visible ?? false;
    }

    markContains(x, y) {
        return this._mark?.containsPoint(x, y) ?? false;
    }

    connect(obj, signal, cb) {
        if (!obj)
            return 0;
        try {
            const id = obj.connect(signal, cb);
            this._signals.push([obj, id]);
            return id;
        } catch (error) {
            console.warn(`windows-onboarding: connect ${signal}: ${error.message}`);
            return 0;
        }
    }

    isSeen(id) {
        return (this._settings.get_strv('seen-hints') ?? []).includes(id);
    }

    markSeen(id) {
        const seen = this._settings.get_strv('seen-hints');
        if (seen.includes(id))
            return;
        this._settings.set_strv('seen-hints', [...seen, id]);
    }

    shouldShow(id) {
        if (!this._settings.get_boolean('enabled'))
            return false;
        if (this._spotlightOwned)
            return false;
        if (this.isSeen(id))
            return false;
        if (this._mark?.visible)
            return false;

        const hint = getHint(this._hints, id);
        if (!hint)
            return false;
        if (!hint.defaultEnabled) {
            if (!hint.prefKey || !this._settings.get_boolean(hint.prefKey))
                return false;
        }
        const now = GLib.get_monotonic_time() / 1000;
        if (this._lastShownAt && now - this._lastShownAt < COOLDOWN_MS)
            return false;
        return true;
    }

    tryShow(id, target) {
        if (!this.shouldShow(id))
            return false;
        const hint = getHint(this._hints, id);
        if (!hint)
            return false;

        this.markSeen(id);
        this._activeHint = hint;
        this._lastShownAt = GLib.get_monotonic_time() / 1000;

        const accessible = `${hint.windows} → ${hint.gnome}`;
        try {
            this._mark.show({
                target: target ?? Main.panel,
                text: hint.body,
                accessibleName: accessible,
            });
            return true;
        } catch (error) {
            console.warn(`windows-onboarding: show ${id}: ${error.message}`);
            return false;
        }
    }

    dismissFromEscape() {
        if (this._mark?.visible)
            this._mark.dismiss(true);
    }

    dismissFromClickAway() {
        if (this._mark?.visible)
            this._mark.dismiss(true);
    }

    dismissIfScoped(scope) {
        if (!this._mark?.visible || !this._activeHint)
            return;
        if (scope === 'overview' && this._activeHint.dismissOnOverviewHidden)
            this._mark.dismiss(true);
    }
}
