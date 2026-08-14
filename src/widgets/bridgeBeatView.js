/* bridgeBeatView.js — synthesis beat connecting GUI and terminal (§1.7).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import { HintPanel } from './hintPanel.js';

export const BridgeBeatView = GObject.registerClass({
    GTypeName: 'BridgeBeatView',
    Signals: {
        'hint-revealed': {},
    },
}, class BridgeBeatView extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            vexpand: true,
            ...params,
        });
    }

    setStep(_module, step) {
        let child = this.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this.remove(child);
            child = next;
        }

        const center = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            halign: Gtk.Align.CENTER,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            width_request: 720,
        });

        if (step.title) {
            center.append(new Gtk.Label({
                label: step.title,
                css_classes: ['title-2'],
                wrap: true,
                justify: Gtk.Justification.CENTER,
            }));
        }

        center.append(new Gtk.Label({
            label: step.body,
            wrap: true,
            justify: Gtk.Justification.FILL,
            max_width_chars: 52,
            halign: Gtk.Align.CENTER,
        }));

        const hints = step.hints ?? [];
        if (hints.length > 0) {
            const hintPanel = new HintPanel();
            hintPanel.setHints(hints);
            hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
            center.append(hintPanel);
        }

        this.append(center);
    }
});
