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
import { setAccessibleDescription, setAccessibleLabel } from '../engine/a11yUtils.js';
import { HintPanel } from './hintPanel.js';

const SENTINEL_RE = /__LA:(-?\d+):(.*)/;

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
        'skip-requested': {},
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
        this._spawned = false;
        this._validationPattern = null;
        this._expectExit = null;
        this._handledSentinel = null;

        this._realSystemBanner = new Adw.Banner({
            title: _('This step installs real software on your actual computer. There\'s no reset button for this one.'),
            revealed: false,
        });
        this._realSystemBanner.connect('notify::revealed', () => {
            if (this._realSystemBanner.revealed)
                setAccessibleLabel(this._realSystemBanner, this._realSystemBanner.title);
        });
        this.append(this._realSystemBanner);

        this._instruction = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            css_classes: ['title-4'],
        });
        setAccessibleDescription(this._instruction, _('Step instructions'));
        this.append(this._instruction);

        this._sandboxLabel = new Gtk.Label({
            wrap: true,
            halign: Gtk.Align.START,
            css_classes: ['dim-label', 'caption'],
            visible: false,
        });
        this.append(this._sandboxLabel);

        this._terminal = new Vte.Terminal({
            vexpand: true,
            hexpand: true,
            margin_top: 6,
        });
        setAccessibleLabel(this._terminal, _('Practice terminal'));
        this._terminal.set_size_request(-1, 280);
        this._terminal.connect('contents-changed', () => this._checkSentinel());
        this.append(this._terminal);

        const toolbar = new Gtk.Box({ spacing: 6 });
        this._resetButton = new Gtk.Button({ label: _('Reset step') });
        setAccessibleDescription(
            this._resetButton,
            _('Restore the practice folder to its original state'),
        );
        this._resetButton.connect('clicked', () => this.emit('reset-requested'));
        toolbar.append(this._resetButton);

        this._skipButton = new Gtk.Button({ label: _('Skip validation') });
        setAccessibleDescription(
            this._skipButton,
            _('Mark this step complete without checking your command'),
        );
        this._skipButton.connect('clicked', () => this.emit('validated'));
        toolbar.append(this._skipButton);
        this.append(toolbar);

        this._hintPanel = new HintPanel();
        this._hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
        this.append(this._hintPanel);

        this.connect('map', () => applyAdwaitaTheme(this._terminal, this));
    }

    start(step, sandboxPath) {
        this._step = step;
        this._sandboxPath = sandboxPath;
        this._handledSentinel = null;
        this._validationPattern = step.validate?.pattern
            ? new RegExp(step.validate.pattern)
            : null;
        this._expectExit = step.validate?.expect_exit ?? null;

        this._instruction.label = step.instruction?.trim() ?? '';
        const realSystem = step.sandbox === false;
        this._realSystemBanner.revealed = realSystem;
        this._resetButton.visible = !realSystem;

        if (realSystem) {
            this._sandboxLabel.visible = false;
        } else if (sandboxPath) {
            this._sandboxLabel.label = _('Practice folder (not your real files): %s').format(sandboxPath);
            this._sandboxLabel.visible = true;
            setAccessibleDescription(
                this._sandboxLabel,
                _('Files here are copies for learning; your real home folder is not used.'),
            );
            setAccessibleDescription(this._terminal, this._sandboxLabel.label);
        } else {
            this._sandboxLabel.visible = false;
        }

        this._hintPanel.setHints(step.hints ?? []);
        this._spawnShell();
    }

    reset(step, sandboxPath) {
        this._spawned = false;
        this._handledSentinel = null;
        this._hintPanel.clearHintBadge();
        this.start(step, sandboxPath);
    }

    scheduleHintBadge() {
        this._hintPanel.scheduleHintBadge(5000);
    }

    _shouldUseBwrap() {
        if (this._step?.sandbox === false)
            return false;
        if (GLib.getenv('GNOME_TUTOR_USE_BWRAP') === '0')
            return false;
        return GLib.find_program_in_path('bwrap') !== null;
    }

    _shellArgv(cwd) {
        const bashrc = GLib.build_filenamev([cwd, '.bashrc']);
        const hasBashrc = GLib.file_test(bashrc, GLib.FileTest.EXISTS);

        if (this._shouldUseBwrap()) {
            return [
                'bwrap',
                '--ro-bind', '/usr', '/usr',
                '--symlink', 'usr/lib', '/lib',
                '--symlink', 'usr/lib64', '/lib64',
                '--symlink', 'usr/bin', '/bin',
                '--bind', cwd, '/home/learner',
                '--chdir', '/home/learner',
                '--unshare-all', '--die-with-parent',
                '--setenv', 'HOME', '/home/learner',
                '/bin/bash',
                ...(hasBashrc ? ['--rcfile', '.bashrc'] : ['--noprofile']),
            ];
        }

        const shell = GLib.find_program_in_path('bash') ?? '/bin/bash';
        if (hasBashrc)
            return [shell, '--rcfile', '.bashrc'];
        return [shell, '--noprofile', '--norc'];
    }

    _spawnShell() {
        const realSystem = this._step?.sandbox === false;
        const cwd = realSystem
            ? GLib.get_home_dir()
            : this._sandboxPath;

        if (!cwd) {
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

        const argv = this._shellArgv(cwd);
        const envv = ['TERM=xterm-256color'];

        this._terminal.spawn_async(
            this._Vte.PtyFlags.DEFAULT,
            cwd,
            argv,
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
                if (!realSystem)
                    this._terminal.feed(`Lesson sandbox: ${cwd}\r\n`);
            },
        );
    }

    _checkSentinel() {
        if (!this._validationPattern)
            return;

        const [, text] = this._terminal.get_text(true);
        const lines = text.split('\n').filter(line => line.includes('__LA:'));
        const last = lines[lines.length - 1];
        if (!last || last === this._handledSentinel)
            return;

        const match = SENTINEL_RE.exec(last);
        if (!match)
            return;

        const exitCode = Number.parseInt(match[1], 10);
        const command = match[2]?.trim() ?? '';
        if (!this._validationPattern.test(command))
            return;

        if (this._expectExit !== null && this._expectExit !== undefined
            && exitCode !== this._expectExit)
            return;

        this._handledSentinel = last;
        this.emit('validated');
    }
});
