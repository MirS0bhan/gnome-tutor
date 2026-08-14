/* instructionCardWindow.js — floating card for GUI beats (§5.2).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { HintPanel } from './hintPanel.js';
import { AppLauncher } from '../engine/appLauncher.js';

export const InstructionCardWindow = GObject.registerClass({
    GTypeName: 'InstructionCardWindow',
    Signals: {
        'open-app': {},
        'next-phase': {},
        'done': {},
        'hint-revealed': {},
    },
}, class InstructionCardWindow extends Adw.Window {
    constructor(params = {}) {
        super({
            title: _('Lesson instructions'),
            default_width: 380,
            default_height: 420,
            modal: false,
            resizable: true,
            ...params,
        });

        this.set_hide_on_close(true);

        const toolbar = new Adw.ToolbarView();
        this._headerTitle = new Adw.WindowTitle({
            title: _('Follow along in Files'),
            subtitle: _('Open Files, then complete each step'),
        });
        toolbar.add_top_bar(new Adw.HeaderBar({
            title_widget: this._headerTitle,
        }));

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        this._goalLabel = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.FILL,
            css_classes: ['title-4'],
        });
        box.append(this._goalLabel);

        this._phaseLabel = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.FILL,
        });
        box.append(this._phaseLabel);

        this._progressLabel = new Gtk.Label({
            css_classes: ['dim-label', 'caption'],
            halign: Gtk.Align.START,
            visible: false,
        });
        box.append(this._progressLabel);

        this._spotlightNote = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            css_classes: ['dim-label', 'caption'],
            visible: false,
        });
        box.append(this._spotlightNote);

        const actions = new Gtk.Box({ spacing: 8 });

        this._openButton = new Gtk.Button({
            label: _('Open practice folder in Files'),
            css_classes: ['suggested-action'],
        });
        this._openButton.connect('clicked', () => this.emit('open-app'));
        actions.append(this._openButton);

        this._nextButton = new Gtk.Button({
            label: _('Next step'),
            visible: false,
        });
        this._nextButton.connect('clicked', () => this.emit('next-phase'));
        actions.append(this._nextButton);

        this._doneButton = new Gtk.Button({
            label: _('Done, next step'),
            css_classes: ['suggested-action'],
            visible: false,
        });
        this._doneButton.connect('clicked', () => this.emit('done'));
        actions.append(this._doneButton);

        box.append(actions);

        this._hintPanel = new HintPanel();
        this._hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
        box.append(this._hintPanel);

        toolbar.set_content(box);
        this.set_content(toolbar);
    }

    presentStep(module, step, { spotlightAvailable, stepIndex, stepTotal }) {
        this._phaseIndex = -1;
        this._phaseTotal = step.phases?.length ?? 1;
        const appName = AppLauncher.displayName(step.target_app);

        this._headerTitle.title = _('Follow along in %s').format(appName);
        this._headerTitle.subtitle = _('%1$s · Step %2$d of %3$d').format(
            module.title,
            stepIndex + 1,
            stepTotal,
        );
        this._goalLabel.label = step.instruction?.trim() ?? '';

        this._phaseLabel.label = step.target_app === 'org.gnome.Nautilus'
            ? _('Press the button below to open Files on the practice folder.')
            : _('Press the button below to open %s.').format(appName);
        this._progressLabel.visible = false;

        this._spotlightNote.visible = !spotlightAvailable;
        this._spotlightNote.label = spotlightAvailable
            ? ''
            : _('Spotlight extension not detected — follow the text instructions above.');

        this._hintPanel.setHints(step.hints ?? []);

        this._openButton.label = step.target_app === 'org.gnome.Nautilus'
            ? _('Open practice folder in Files')
            : _('Open %s').format(appName);
        this._openButton.visible = true;
        this._openButton.sensitive = true;
        this._nextButton.visible = false;
        this._doneButton.visible = false;

        this.set_keep_above(true);
        this.present();
    }

    onAppOpened(phaseIndex, phaseTotal, phase) {
        this._phaseIndex = phaseIndex;
        this._phaseTotal = phaseTotal;
        this._openButton.visible = false;
        this._updatePhase(phase);
    }

    onPhaseAdvanced(phaseIndex, phaseTotal, phase) {
        this._phaseIndex = phaseIndex;
        this._phaseTotal = phaseTotal;
        this._updatePhase(phase);
    }

    _updatePhase(phase) {
        const instruction = phase?.instruction ?? phase?.label ?? '';
        this._phaseLabel.label = instruction;

        const isLast = this._phaseIndex + 1 >= this._phaseTotal;
        this._nextButton.visible = !isLast;
        this._doneButton.visible = isLast;

        this._progressLabel.visible = this._phaseTotal > 1;
        this._progressLabel.label = _('%1$d of %2$d').format(
            this._phaseIndex + 1,
            this._phaseTotal,
        );
    }

    dismiss() {
        this.set_keep_above(false);
        if (this.visible)
            this.hide();
    }
});
