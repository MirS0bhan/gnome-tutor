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

    setStep(module, step) {
        let child = this.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this.remove(child);
            child = next;
        }

        if (step.title) {
            this.append(new Gtk.Label({
                label: step.title,
                css_classes: ['title-2'],
                halign: Gtk.Align.START,
                wrap: true,
            }));
        }

        this.append(new Gtk.Label({
            label: step.body,
            wrap: true,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.FILL,
        }));

        const hints = step.hints ?? [];
        if (hints.length > 0) {
            const hintPanel = new HintPanel();
            hintPanel.setHints(hints);
            hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
            this.append(hintPanel);
        }
    }
});
