/* terminalBeat.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Vte from 'gi://Vte?version=3.91';

import { HintPanel } from './hintPanel.js';

export const TerminalBeat = GObject.registerClass({
    GTypeName: 'TerminalBeat',
    Signals: {
        'validated': {},
        'hint-revealed': {},
        'reset-requested': {},
    },
}, class TerminalBeat extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            vexpand: true,
            ...params,
        });

        this._step = null;
        this._sandboxPath = null;
        this._lineBuffer = '';
        this._spawned = false;
        this._validationPattern = null;

        this._instruction = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            css_classes: ['title-4'],
        });
        this.append(this._instruction);

        this._terminal = new Vte.Terminal({
            vexpand: true,
            hexpand: true,
            margin_top: 6,
        });
        this._terminal.set_size_request(-1, 280);
        this._terminal.connect('commit', (_term, text) => this._onCommit(text));
        this.append(this._terminal);

        const toolbar = new Gtk.Box({ spacing: 6 });
        this._resetButton = new Gtk.Button({ label: _('Reset step') });
        this._resetButton.connect('clicked', () => this.emit('reset-requested'));
        toolbar.append(this._resetButton);
        this.append(toolbar);

        this._hintPanel = new HintPanel();
        this._hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
        this.append(this._hintPanel);
    }

    start(step, sandboxPath) {
        this._step = step;
        this._sandboxPath = sandboxPath;
        this._lineBuffer = '';
        this._validationPattern = step.validate?.pattern
            ? new RegExp(step.validate.pattern)
            : null;

        this._instruction.label = step.instruction;
        this._hintPanel.setHints(step.hints ?? []);
        this._spawnShell();
    }

    reset(step, sandboxPath) {
        this._spawned = false;
        this.start(step, sandboxPath);
    }

    _spawnShell() {
        if (this._terminal.get_pty() && this._spawned) {
            try {
                this._terminal.reset(true, true);
            } catch {
                // ignore
            }
        }

        const shell = GLib.getenv('SHELL') || '/bin/bash';
        const envv = [
            'TERM=xterm-256color',
            'PS1=\\$ ',
        ];

        this._terminal.spawn_async(
            Vte.PtyFlags.DEFAULT,
            this._sandboxPath,
            [shell, '--noprofile', '--norc'],
            envv,
            GLib.SpawnFlags.SEARCH_PATH,
            null,
            -1,
            null,
            -1,
            null,
            (_term, _pid, error) => {
                if (error) {
                    this._terminal.feed(`Failed to start shell: ${error.message}\r\n`);
                    return;
                }
                this._spawned = true;
                this._terminal.feed(`Lesson sandbox: ${this._sandboxPath}\r\n`);
            },
        );
    }

    _onCommit(text) {
        if (text === '\r' || text === '\n') {
            const command = this._lineBuffer.trim();
            this._lineBuffer = '';
            if (command)
                this._validateCommand(command);
            return;
        }
        if (text !== '\u007f')
            this._lineBuffer += text;
        else if (this._lineBuffer.length > 0)
            this._lineBuffer = this._lineBuffer.slice(0, -1);
    }

    _validateCommand(command) {
        if (!this._validationPattern)
            return;
        if (!this._validationPattern.test(command))
            return;
        this.emit('validated');
    }
});
