/* coachMark.js
 *
 * Ring + bubble coach-mark. The ring never steals clicks.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const RING_PAD = 8;
const BUBBLE_GAP = 12;
const BUBBLE_WIDTH = 360;

function animationsEnabled() {
    try {
        return St.Settings.get().enable_animations;
    } catch {
        return true;
    }
}

export const CoachMark = GObject.registerClass(
class CoachMark extends GObject.Object {
    _init() {
        super._init();
        this._ring = null;
        this._bubble = null;
        this._target = null;
        this._allocationId = 0;
        this._monitorId = 0;
        this._onDismiss = null;
    }

    get visible() {
        return this._bubble !== null;
    }

    containsPoint(x, y) {
        if (!this._bubble)
            return false;
        const [bx, by] = this._bubble.get_transformed_position();
        const bw = this._bubble.width;
        const bh = this._bubble.height;
        return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
    }

    show({target, text, accessibleName, onDismiss}) {
        this.dismiss(false);
        this._target = target ?? null;
        this._onDismiss = onDismiss ?? null;

        this._ring = new St.Widget({
            style_class: 'windows-onboarding-ring',
            reactive: false,
            can_focus: false,
            visible: Boolean(target),
        });
        Main.uiGroup.add_child(this._ring);

        this._bubble = new St.BoxLayout({
            style_class: 'windows-onboarding-bubble',
            vertical: true,
            reactive: true,
            can_focus: true,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
        });
        this._bubble.accessible_name = accessibleName ?? text;

        const header = new St.BoxLayout({
            vertical: false,
            x_expand: true,
        });

        const label = new St.Label({
            text,
            style_class: 'windows-onboarding-label',
            reactive: false,
            x_expand: true,
        });
        label.clutter_text.line_wrap = true;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        label.width = BUBBLE_WIDTH - 48;

        const close = new St.Button({
            style_class: 'windows-onboarding-close',
            can_focus: true,
            accessible_name: _('Dismiss'),
        });
        close.set_child(new St.Icon({
            icon_name: 'window-close-symbolic',
            icon_size: 16,
        }));
        close.connect('clicked', () => this.dismiss(true));

        header.add_child(label);
        header.add_child(close);
        this._bubble.add_child(header);
        Main.uiGroup.add_child(this._bubble);

        if (this._target) {
            this._allocationId = this._target.connect('notify::allocation', () => this.reposition());
        }
        this._monitorId = Main.layoutManager.connect('monitors-changed', () => this.reposition());
        this.reposition();

        if (animationsEnabled()) {
            this._bubble.opacity = 0;
            this._bubble.ease({
                opacity: 255,
                duration: 160,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    reposition() {
        if (!this._bubble)
            return;

        const monitor = Main.layoutManager.primaryMonitor;
        let tx = monitor.x + 24;
        let ty = monitor.y + Main.panel.height + 24;
        let tw = 48;
        let th = 48;

        if (this._target) {
            try {
                const [px, py] = this._target.get_transformed_position();
                tx = px;
                ty = py;
                tw = Math.max(this._target.width, 32);
                th = Math.max(this._target.height, 32);
            } catch {
                // keep fallback geometry
            }
        }

        if (this._ring) {
            this._ring.set_position(Math.round(tx - RING_PAD), Math.round(ty - RING_PAD));
            this._ring.set_size(Math.round(tw + RING_PAD * 2), Math.round(th + RING_PAD * 2));
            this._ring.visible = Boolean(this._target);
        }

        this._bubble.width = BUBBLE_WIDTH;
        let bx = tx;
        let by = ty + th + BUBBLE_GAP;

        if (bx + BUBBLE_WIDTH > monitor.x + monitor.width - 12)
            bx = monitor.x + monitor.width - BUBBLE_WIDTH - 12;
        if (bx < monitor.x + 12)
            bx = monitor.x + 12;

        const bubbleHeight = Math.max(this._bubble.height, 72);
        if (by + bubbleHeight > monitor.y + monitor.height - 12)
            by = ty - bubbleHeight - BUBBLE_GAP;
        if (by < monitor.y + Main.panel.height + 8)
            by = monitor.y + Main.panel.height + 8;

        this._bubble.set_position(Math.round(bx), Math.round(by));
    }

    dismiss(_user = true) {
        if (this._allocationId && this._target) {
            try {
                this._target.disconnect(this._allocationId);
            } catch {
                // already gone
            }
        }
        this._allocationId = 0;

        if (this._monitorId) {
            try {
                Main.layoutManager.disconnect(this._monitorId);
            } catch {
                // already gone
            }
        }
        this._monitorId = 0;

        if (this._ring) {
            this._ring.destroy();
            this._ring = null;
        }
        if (this._bubble) {
            this._bubble.destroy();
            this._bubble = null;
        }
        this._target = null;
        const cb = this._onDismiss;
        this._onDismiss = null;
        if (cb)
            cb();
    }

    destroy() {
        this.dismiss(false);
    }
});
