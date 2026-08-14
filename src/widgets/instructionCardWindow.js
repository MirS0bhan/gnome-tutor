/* instructionCardWindow.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { HintPanel } from './hintPanel.js';

export const InstructionCardWindow = GObject.registerClass({
    GTypeName: 'InstructionCardWindow',
    Signals: {
        'done': {},
        'hint-revealed': {},
    },
}, class InstructionCardWindow extends Adw.Window {
    constructor(params = {}) {
        super({
            title: _('Lesson instructions'),
            default_width: 360,
            default_height: 280,
            modal: false,
            resizable: true,
            ...params,
        });

        this.set_hide_on_close(true);

        const toolbar = new Adw.ToolbarView();
        const header = new Adw.HeaderBar({
            title_widget: new Adw.WindowTitle({
                title: _('Follow along'),
                subtitle: _('Complete the task, then press Done'),
            }),
        });
        toolbar.add_top_bar(header);

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        this._instruction = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.FILL,
        });
        box.append(this._instruction);

        this._hintPanel = new HintPanel();
        this._hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
        box.append(this._hintPanel);

        this._doneButton = new Gtk.Button({
            label: _('Done, next step'),
            css_classes: ['suggested-action'],
            halign: Gtk.Align.END,
        });
        this._doneButton.connect('clicked', () => this.emit('done'));
        box.append(this._doneButton);

        toolbar.set_content(box);
        this.set_content(toolbar);
    }

    presentInstruction(step) {
        this._instruction.label = step.instruction;
        this._hintPanel.setHints(step.hints ?? []);
        this.present();
    }
});
