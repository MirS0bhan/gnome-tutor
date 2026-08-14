/* hintPanel.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

export const HintPanel = GObject.registerClass({
    GTypeName: 'HintPanel',
    Signals: {
        'hint-revealed': {},
    },
}, class HintPanel extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            ...params,
        });

        this._hints = [];
        this._revealed = 0;
        this._badgeTimeout = 0;

        this._buttonBox = new Gtk.Box({ spacing: 6, halign: Gtk.Align.START });
        this._button = new Gtk.Button({
            label: _('Need a hint?'),
            css_classes: ['flat'],
        });
        this._button.connect('clicked', () => this._revealNext());
        this._buttonBox.append(this._button);

        this._badge = new Gtk.Label({
            label: '●',
            css_classes: ['accent', 'caption'],
            visible: false,
            valign: Gtk.Align.CENTER,
        });
        this._buttonBox.append(this._badge);
        this.append(this._buttonBox);

        this._revealedBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
        });
        this.append(this._revealedBox);

        this._moreLink = new Gtk.Button({
            label: _('Show me more'),
            css_classes: ['flat', 'dim-label'],
            halign: Gtk.Align.START,
            visible: false,
        });
        this._moreLink.connect('clicked', () => this._revealNext());
        this.append(this._moreLink);
    }

    setHints(hints = []) {
        this.clearHintBadge();
        this._hints = hints ?? [];
        this._revealed = 0;
        this._revealedBox.visible = false;
        this._moreLink.visible = false;
        let child = this._revealedBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._revealedBox.remove(child);
            child = next;
        }
        this._button.visible = this._hints.length > 0;
        this._button.sensitive = this._hints.length > 0;
        this._button.label = _('Need a hint?');
        this._badge.visible = false;
    }

    scheduleHintBadge(delayMs = 5000) {
        this.clearHintBadge();
        if (!this._hints.length)
            return;
        this._badgeTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._badgeTimeout = 0;
            if (this._revealed < this._hints.length)
                this._badge.visible = true;
            return GLib.SOURCE_REMOVE;
        });
    }

    clearHintBadge() {
        if (this._badgeTimeout) {
            GLib.source_remove(this._badgeTimeout);
            this._badgeTimeout = 0;
        }
        this._badge.visible = false;
    }

    _revealNext() {
        if (this._revealed >= this._hints.length)
            return;

        this._badge.visible = false;
        const hint = this._hints[this._revealed++];
        this._revealedBox.visible = true;
        this._revealedBox.append(new Gtk.Label({
            label: hint,
            wrap: true,
            halign: Gtk.Align.START,
            css_classes: ['dim-label'],
        }));
        this.emit('hint-revealed');

        if (this._revealed >= this._hints.length) {
            this._moreLink.visible = false;
            this._button.sensitive = false;
        } else {
            this._moreLink.visible = true;
        }
    }
});
