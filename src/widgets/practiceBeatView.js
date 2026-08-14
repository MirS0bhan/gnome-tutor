/* practiceBeatView.js — free-practice terminal sandbox (Track 9).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { createTerminalBeat } from './terminalBeat.js';

export const PracticeBeatView = GObject.registerClass({
    GTypeName: 'PracticeBeatView',
    Signals: {
        'hint-revealed': {},
        'reset-requested': {},
    },
}, class PracticeBeatView extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            ...params,
        });

        this._terminalHost = new Gtk.Box({ vexpand: true });
        this._beat = null;
        this._challenges = [];
        this._selectedStep = null;
        this._sandboxPath = null;
        this._activeChallenge = null;

        this._headerLabel = new Gtk.Label({
            label: _('Your practice space — nothing here resets automatically.'),
            css_classes: ['title-4'],
            halign: Gtk.Align.START,
            wrap: true,
            margin_start: 24,
            margin_end: 24,
            margin_top: 12,
        });
        this.append(this._headerLabel);

        this._challengeExpander = new Gtk.Expander({
            label: _('Challenges'),
            margin_start: 24,
            margin_end: 24,
        });
        this._challengeList = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
        this._challengeExpander.set_child(this._challengeList);
        this.append(this._challengeExpander);

        const toolbar = new Gtk.Box({
            spacing: 8,
            margin_start: 24,
            margin_end: 24,
        });
        this._startFreshButton = new Gtk.Button({ label: _('Start fresh') });
        this._startFreshButton.connect('clicked', () => this.emit('reset-requested'));
        toolbar.append(this._startFreshButton);
        this.append(toolbar);

        this.append(this._terminalHost);
    }

    async showPractice(step, sandboxPath) {
        this._challenges = step.challenges ?? [];
        this._selectedStep = step;
        this._sandboxPath = sandboxPath;
        this._activeChallenge = null;
        this._headerLabel.label = _('Your practice space — nothing here resets automatically.');

        let child = this._challengeList.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._challengeList.remove(child);
            child = next;
        }
        this._challengeExpander.visible = this._challenges.length > 0;

        for (const challenge of this._challenges) {
            const button = new Gtk.Button({
                label: challenge.title,
                css_classes: ['flat'],
                halign: Gtk.Align.START,
            });
            button.connect('clicked', () => this._activateChallenge(challenge));
            this._challengeList.append(button);
        }

        if (!this._beat) {
            this._beat = await createTerminalBeat({ vexpand: true, hexpand: true });
            this._beat.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._terminalHost.append(this._beat);
        }

        this._beat.reset(step, sandboxPath);
    }

    _activateChallenge(challenge) {
        this._activeChallenge = challenge;
        this._headerLabel.label = challenge.title;
        this._beat.reset({
            instruction: challenge.instruction,
            hints: challenge.hints ?? [],
            validate: challenge.validate,
        }, this._sandboxPath);
    }
});
