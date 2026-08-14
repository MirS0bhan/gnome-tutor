/* terminalBeat.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { loadVte } from '../engine/vteLoader.js';
import { applyAdwaitaTheme } from '../engine/vteTheme.js';
import { HintPanel } from './hintPanel.js';

const EXIT_PROBE = '__GNOME_TUTOR_EXIT:';

export async function createTerminalBeat(params = {}) {
    const vteModule = await loadVte();
    if (!vteModule)
        return new TerminalBeatUnavailable(params);
    return new TerminalBeat(vteModule.default, params);
}

const TerminalBeatUnavailable = GObject.registerClass({
    GTypeName: 'TerminalBeatUnavailable',
    Signals: {
        'validated': {},
        'hint-revealed': {},
        'reset-requested': {},
        'skip-requested': {},
    },
}, class TerminalBeatUnavailable extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            ...params,
        });
        this.append(new Adw.StatusPage({
            icon_name: 'utilities-terminal-symbolic',
            title: _('Terminal unavailable'),
            description: _('The VTE library is not installed in this environment. Use Continue below to skip this step, or reinstall from an updated Flatpak build.'),
            vexpand: true,
        }));
    }

    start() {}
    reset() {}
});

export const TerminalBeat = GObject.registerClass({
    GTypeName: 'TerminalBeat',
    Signals: {
        'validated': {},
        'hint-revealed': {},
        'reset-requested': {},
    },
}, class TerminalBeat extends Gtk.Box {
    constructor(Vte, params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            vexpand: true,
            ...params,
        });

        this._Vte = Vte;
        this._step = null;
        this._sandboxPath = null;
        this._lineBuffer = '';
        this._spawned = false;
        this._validationPattern = null;
        this._expectExit = null;
        this._pendingCommand = null;
        this._exitProbeSource = 0;

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
        this._terminal.connect('contents-changed', () => this._onContentsChanged());
        this.append(this._terminal);

        const toolbar = new Gtk.Box({ spacing: 6 });
        this._resetButton = new Gtk.Button({ label: _('Reset step') });
        this._resetButton.connect('clicked', () => this.emit('reset-requested'));
        toolbar.append(this._resetButton);
        this.append(toolbar);

        this._hintPanel = new HintPanel();
        this._hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
        this.append(this._hintPanel);

        this.connect('map', () => applyAdwaitaTheme(this._terminal, this));
    }

    start(step, sandboxPath) {
        this._cancelExitProbe();
        this._step = step;
        this._sandboxPath = sandboxPath;
        this._lineBuffer = '';
        this._pendingCommand = null;
        this._validationPattern = step.validate?.pattern
            ? new RegExp(step.validate.pattern)
            : null;
        this._expectExit = step.validate?.expect_exit ?? null;

        this._instruction.label = step.instruction;
        this._hintPanel.setHints(step.hints ?? []);
        this._spawnShell();
    }

    reset(step, sandboxPath) {
        this._spawned = false;
        this.start(step, sandboxPath);
    }

    _cancelExitProbe() {
        if (this._exitProbeSource) {
            GLib.source_remove(this._exitProbeSource);
            this._exitProbeSource = 0;
        }
    }

    _spawnShell() {
        if (!this._sandboxPath) {
            this._terminal.feed('Sandbox folder is not ready.\r\n');
            return;
        }

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
            this._Vte.PtyFlags.DEFAULT,
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
                applyAdwaitaTheme(this._terminal, this);
                this._terminal.feed(`Lesson sandbox: ${this._sandboxPath}\r\n`);
            },
        );
    }

    _onCommit(text) {
        if (text === '\r' || text === '\n') {
            const command = this._lineBuffer.trim();
            this._lineBuffer = '';
            if (command)
                this._queueValidation(command);
            return;
        }
        if (text !== '\u007f')
            this._lineBuffer += text;
        else if (this._lineBuffer.length > 0)
            this._lineBuffer = this._lineBuffer.slice(0, -1);
    }

    _queueValidation(command) {
        if (!this._validationPattern?.test(command))
            return;

        if (this._expectExit === null || this._expectExit === undefined) {
            this.emit('validated');
            return;
        }

        this._pendingCommand = command;
        this._cancelExitProbe();
        this._exitProbeSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 350, () => {
            this._exitProbeSource = 0;
            this._terminal.feed(`echo "${EXIT_PROBE}$?"\r`);
            return GLib.SOURCE_REMOVE;
        });
    }

    _onContentsChanged() {
        if (!this._pendingCommand)
            return;

        const [, text] = this._terminal.get_text(true);
        const marker = `${EXIT_PROBE}`;
        const index = text.lastIndexOf(marker);
        if (index < 0)
            return;

        const tail = text.slice(index + marker.length);
        const match = tail.match(/^(-?\d+)/);
        if (!match)
            return;

        const exitCode = Number.parseInt(match[1], 10);
        if (exitCode === this._expectExit) {
            this._pendingCommand = null;
            this.emit('validated');
        }
    }
});
