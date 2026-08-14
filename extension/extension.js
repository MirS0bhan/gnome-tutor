/* extension.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const BUS_NAME = 'systems.misano.LinuxAcademy.Spotlight';
const OBJECT_PATH = '/systems/misano/LinuxAcademy/Spotlight';

const SpotlightIface = `
<node>
  <interface name="systems.misano.LinuxAcademy.Spotlight">
    <method name="Highlight">
      <arg type="i" name="x" direction="in"/>
      <arg type="i" name="y" direction="in"/>
      <arg type="i" name="w" direction="in"/>
      <arg type="i" name="h" direction="in"/>
      <arg type="s" name="label" direction="in"/>
    </method>
    <method name="HighlightWindow">
      <arg type="s" name="wm_class" direction="in"/>
      <arg type="s" name="label" direction="in"/>
      <arg type="b" name="found" direction="out"/>
    </method>
    <method name="UpdateLabel">
      <arg type="s" name="label" direction="in"/>
    </method>
    <method name="Clear">
    </method>
  </interface>
</node>`;

export default class Extension {
    enable() {
        this._actors = [];
        this._label = null;
        this._labelAnchor = null;
        this._ownerId = 0;

        this._impl = {
            Highlight: (x, y, w, h, label) => this._highlightRect(x, y, w, h, label),
            HighlightWindow: (wmClass, label) => this._highlightWindow(wmClass, label),
            UpdateLabel: label => this._updateLabel(label),
            Clear: () => this._clear(),
        };

        this._dbus = Gio.DBusExportedObject.wrapJSObject(SpotlightIface, this._impl);
        this._ownerId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            BUS_NAME,
            Gio.BusNameOwnerFlags.ALLOW_REPLACEMENT,
            connection => this._dbus.export(connection, OBJECT_PATH),
            () => {},
            () => {},
        );
    }

    disable() {
        this._clear();
        if (this._ownerId)
            Gio.bus_unown_name(this._ownerId);
        this._ownerId = 0;
    }

    _monitorGeometry() {
        const monitor = Main.layoutManager.primaryMonitor;
        return {
            x: monitor.x,
            y: monitor.y,
            width: monitor.width,
            height: monitor.height,
        };
    }

    _clear() {
        for (const actor of this._actors)
            actor.destroy();
        this._actors = [];
        if (this._label) {
            this._label.destroy();
            this._label = null;
        }
        this._labelAnchor = null;
    }

    _addShield(x, y, width, height) {
        const actor = new St.Widget({
            reactive: false,
            can_focus: false,
            style: 'background-color: rgba(0, 0, 0, 0.55);',
            x,
            y,
            width,
            height,
        });
        Main.uiGroup.add_child(actor);
        this._actors.push(actor);
    }

    _showLabel(label, rx, ry) {
        if (this._label) {
            this._label.destroy();
            this._label = null;
        }

        if (!label)
            return;

        const monitor = this._monitorGeometry();
        this._labelAnchor = { rx, ry };
        this._label = new St.Label({
            text: label,
            style: 'background-color: rgba(0, 0, 0, 0.85); color: white; padding: 10px 14px; border-radius: 10px; font-size: 15px; max-width: 480px;',
            x: rx,
            y: Math.max(monitor.y + 8, ry - 48),
        });
        Main.uiGroup.add_child(this._label);
    }

    _updateLabel(label) {
        if (!this._label || !this._labelAnchor)
            return false;
        this._label.text = label ?? '';
        return true;
    }

    _highlightRect(x, y, w, h, label) {
        this._clear();
        const monitor = this._monitorGeometry();
        const rx = monitor.x + x;
        const ry = monitor.y + y;

        this._addShield(monitor.x, monitor.y, monitor.width, Math.max(0, ry - monitor.y));
        this._addShield(monitor.x, ry + h, monitor.width, Math.max(0, monitor.y + monitor.height - (ry + h)));
        this._addShield(monitor.x, ry, Math.max(0, rx - monitor.x), h);
        this._addShield(rx + w, ry, Math.max(0, monitor.x + monitor.width - (rx + w)), h);

        const frame = new St.Widget({
            reactive: false,
            style: 'border: 3px solid #62a0ea; border-radius: 8px;',
            x: rx,
            y: ry,
            width: w,
            height: h,
        });
        Main.uiGroup.add_child(frame);
        this._actors.push(frame);

        this._showLabel(label, rx, ry);
    }

    _findWindow(wmClass) {
        const windows = global.display.get_tab_list(Meta.TabList.NORMAL, null);
        const needle = (wmClass ?? '').toLowerCase().trim();

        if (!needle || needle === 'nautilus') {
            return windows.find(meta => {
                const wm = meta.get_wm_class()?.toLowerCase() ?? '';
                const instance = meta.get_wm_class_instance()?.toLowerCase() ?? '';
                return wm.includes('nautilus') || instance.includes('nautilus');
            });
        }

        return windows.find(meta => {
            const wm = meta.get_wm_class()?.toLowerCase() ?? '';
            const instance = meta.get_wm_class_instance()?.toLowerCase() ?? '';
            return wm.includes(needle) || instance.includes(needle);
        });
    }

    _highlightWindow(wmClass, label) {
        const window = this._findWindow(wmClass);

        if (!window) {
            this._clear();
            return false;
        }

        const monitor = this._monitorGeometry();
        const rect = window.get_frame_rect();
        this._highlightRect(
            rect.x - monitor.x,
            rect.y - monitor.y,
            rect.width,
            rect.height,
            label,
        );
        return true;
    }
}
