/* spotlightClient.js
 *
 * D-Bus client for the optional GNOME Shell spotlight extension.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';

const BUS_NAME = 'systems.misano.LinuxAcademy.Spotlight';
const OBJECT_PATH = '/systems/misano/LinuxAcademy/Spotlight';

export class SpotlightClient {
    constructor() {
        this._proxy = null;
        this._available = false;
        this._initProxy();
    }

    get available() {
        return this._available;
    }

    _initProxy() {
        try {
            this._proxy = Gio.DBusProxy.new_sync(
                Gio.bus_get_sync(Gio.BusType.SESSION, null),
                Gio.DBusProxyFlags.NONE,
                null,
                BUS_NAME,
                OBJECT_PATH,
                'systems.misano.LinuxAcademy.Spotlight',
                null,
            );
            this._available = this._proxy.get_name_owner() !== null;
        } catch {
            this._available = false;
            this._proxy = null;
        }
    }

    highlight(x, y, w, h, label) {
        if (!this._available)
            return false;
        try {
            this._proxy.Highlight_sync(x, y, w, h, label ?? '');
            return true;
        } catch (error) {
            console.debug(`Spotlight highlight failed: ${error.message}`);
            return false;
        }
    }

    highlightWindow(wmClass, label) {
        if (!this._available)
            return false;
        try {
            return this._proxy.HighlightWindow_sync(wmClass ?? '', label ?? '') === true;
        } catch (error) {
            console.debug(`Spotlight HighlightWindow failed: ${error.message}`);
            return false;
        }
    }

    updateLabel(label) {
        if (!this._available)
            return false;
        try {
            this._proxy.UpdateLabel_sync(label ?? '');
            return true;
        } catch (error) {
            console.debug(`Spotlight UpdateLabel failed: ${error.message}`);
            return false;
        }
    }

    clear() {
        if (!this._available)
            return;
        try {
            this._proxy.Clear_sync();
        } catch (error) {
            console.debug(`Spotlight clear failed: ${error.message}`);
        }
    }
}
