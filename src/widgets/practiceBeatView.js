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
        this._challengeRow = new Adw.ActionRow({
            title: _('Optional challenge'),
            subtitle: _('Pick a one-line task to try'),
        });
        this._challengeDropdown = new Gtk.DropDown({
            model: Gtk.StringList.new([]),
            valign: Gtk.Align.CENTER,
        });
        this._challengeRow.add_suffix(this._challengeDropdown);
        this._challengeRow.set_activatable_widget(this._challengeDropdown);

        this.append(new Adw.Banner({
            title: _('Free practice — this folder persists until you reset it. Nothing here affects your real files.'),
            revealed: true,
        }));
        this.append(this._challengeRow);
        this.append(this._terminalHost);

        this._challengeDropdown.connect('notify::selected', () => {
            if (this._selectedStep)
                this._onChallengeSelected(this._selectedStep, this._sandboxPath);
        });
    }

    async showPractice(step, sandboxPath) {
        this._challenges = step.challenges ?? [];
        const labels = [_('Free practice (no challenge)')];
        for (const challenge of this._challenges)
            labels.push(challenge.title);
        this._challengeDropdown.model = Gtk.StringList.new(labels);
        this._challengeRow.visible = this._challenges.length > 0;
        this._selectedStep = step;
        this._sandboxPath = sandboxPath;

        if (!this._beat) {
            this._beat = await createTerminalBeat({ vexpand: true, hexpand: true });
            this._beat.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._beat.connect('reset-requested', () => this.emit('reset-requested'));
            this._terminalHost.append(this._beat);
        }

        this._challengeDropdown.selected = 0;
        this._beat.reset(step, sandboxPath);
    }

    _onChallengeSelected(step, sandboxPath) {
        const index = this._challengeDropdown.selected;
        if (index <= 0) {
            this._beat.reset(step, sandboxPath);
            return;
        }
        const challenge = this._challenges[index - 1];
        if (!challenge)
            return;
        this._beat.reset({
            instruction: challenge.instruction,
            hints: challenge.hints ?? [],
            validate: challenge.validate,
        }, sandboxPath);
    }
});
