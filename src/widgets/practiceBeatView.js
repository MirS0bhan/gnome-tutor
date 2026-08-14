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
        this.append(new Adw.Banner({
            title: _('Free practice — this folder persists until you reset it. Nothing here affects your real files.'),
            revealed: true,
        }));
        this.append(this._terminalHost);
    }

    async showPractice(step, sandboxPath) {
        if (!this._beat) {
            this._beat = await createTerminalBeat({ vexpand: true, hexpand: true });
            this._beat.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._beat.connect('reset-requested', () => this.emit('reset-requested'));
            this._terminalHost.append(this._beat);
        }
        this._beat.reset(step, sandboxPath);
    }
});
