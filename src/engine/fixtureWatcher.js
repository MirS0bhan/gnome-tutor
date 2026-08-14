/* fixtureWatcher.js — optional soft GUI completion via file monitor (§6.5).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class FixtureWatcher {
    constructor() {
        this._monitor = null;
        this._callback = null;
    }

    watch(path, callback) {
        this.clear();
        if (!path)
            return;

        const file = Gio.File.new_for_path(path);
        if (!file.query_exists(null))
            return;

        this._callback = callback;
        this._monitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
        this._monitor.connect('changed', () => {
            if (this._callback)
                this._callback();
        });
    }

    clear() {
        if (this._monitor) {
            this._monitor.cancel();
            this._monitor = null;
        }
        this._callback = null;
    }
}
