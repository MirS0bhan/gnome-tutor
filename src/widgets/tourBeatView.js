/* tourBeatView.js — in-pane desktop tour beat (Part 2).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { HintPanel } from './hintPanel.js';

export const TourBeatView = GObject.registerClass({
    GTypeName: 'TourBeatView',
    Signals: {
        'continue': {},
        'next-phase': {},
        'hint-revealed': {},
    },
}, class TourBeatView extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            vexpand: true,
            hexpand: true,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            ...params,
        });

        this._breadcrumb = new Gtk.Label({
            css_classes: ['dim-label'],
            halign: Gtk.Align.START,
        });
        this.append(this._breadcrumb);

        this._title = new Gtk.Label({
            label: _('Try it now'),
            css_classes: ['title-2'],
            halign: Gtk.Align.START,
            wrap: true,
        });
        this.append(this._title);

        this._instruction = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            justify: Gtk.Justification.FILL,
            css_classes: ['title-4'],
        });
        this.append(this._instruction);

        this._hintPanel = new HintPanel();
        this._hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
        this.append(this._hintPanel);

        this._actions = new Gtk.Box({
            spacing: 12,
            halign: Gtk.Align.END,
            margin_top: 12,
        });
        this._nextButton = new Gtk.Button({ label: _('Next step'), visible: false });
        this._nextButton.connect('clicked', () => this.emit('next-phase'));
        this._continueButton = new Gtk.Button({
            label: _('Continue'),
            css_classes: ['suggested-action'],
            visible: false,
        });
        this._continueButton.connect('clicked', () => this.emit('continue'));
        this._actions.append(this._nextButton);
        this._actions.append(this._continueButton);
        this.append(this._actions);
    }

    setBreadcrumb(text) {
        this._breadcrumb.label = text;
        this._breadcrumb.visible = !!text;
    }

    setStep(step) {
        this._hintPanel.setHints(step.hints ?? []);
    }

    setPhase(phaseIndex, phaseTotal, phase, { awaitingDetect = false, detectComplete = false } = {}) {
        const instruction = phase?.instruction ?? phase?.label ?? '';
        this._instruction.label = instruction;

        const isLast = phaseIndex + 1 >= phaseTotal;
        const showContinue = detectComplete || (!awaitingDetect && phaseIndex > 0);

        this._nextButton.visible = !isLast && showContinue && !awaitingDetect;
        this._continueButton.visible = isLast && showContinue;
    }

    showDetectComplete(followUpText) {
        if (followUpText)
            this._instruction.label = followUpText;
        this._continueButton.visible = true;
        this._nextButton.visible = false;
    }
});
