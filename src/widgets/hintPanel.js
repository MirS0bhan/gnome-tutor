/* hintPanel.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
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

        this._button = new Gtk.Button({
            label: _('Ask for a hint'),
            halign: Gtk.Align.START,
        });
        this._button.connect('clicked', () => this._revealNext());
        this.append(this._button);

        this._revealedBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
        });
        this.append(this._revealedBox);
    }

    setHints(hints = []) {
        this._hints = hints ?? [];
        this._revealed = 0;
        this._revealedBox.visible = false;
        let child = this._revealedBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._revealedBox.remove(child);
            child = next;
        }
        this._button.visible = this._hints.length > 0;
        this._button.sensitive = this._hints.length > 0;
        this._button.label = _('Ask for a hint');
    }

    _revealNext() {
        if (this._revealed >= this._hints.length)
            return;

        const hint = this._hints[this._revealed++];
        this._revealedBox.visible = true;
        this._revealedBox.append(new Gtk.Label({
            label: hint,
            wrap: true,
            halign: Gtk.Align.START,
            css_classes: ['dim-label'],
        }));
        this.emit('hint-revealed');

        if (this._revealed >= this._hints.length)
            this._button.sensitive = false;
        else
            this._button.label = _('Ask for another hint');
    }
});
