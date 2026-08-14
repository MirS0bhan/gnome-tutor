/* stepView.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { GuiBeatView } from './guiBeatView.js';
import { ContrastBeatView } from './contrastBeatView.js';
import { BridgeBeatView } from './bridgeBeatView.js';
import { PracticeBeatView } from './practiceBeatView.js';

function kindLabel(kind) {
    switch (kind) {
    case 'contrast':
        return _('Contrast');
    case 'gui':
        return _('GUI practice');
    case 'terminal':
        return _('Terminal practice');
    case 'bridge':
        return _('Bridge');
    case 'tour':
        return _('Desktop tour');
    case 'practice':
        return _('Practice');
    case 'challenge':
        return _('Challenge');
    default:
        return kind;
    }
}

export const StepView = GObject.registerClass({
    GTypeName: 'StepView',
    Signals: {
        'continue': {},
        'validated': {},
        'hint-revealed': {},
        'reset-step': {},
        'install-spotlight': {},
    },
}, class StepView extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            ...params,
        });

        this._engine = null;
        this._instructionCard = null;
        this._module = null;
        this._step = null;
        this._terminalUnavailable = false;

        this._stack = new Gtk.Stack({ vexpand: true, hexpand: true });
        this._emptyPage = this._buildEmptyPage();
        this._contentPage = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
        });
        this._contentBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
        });
        this._contentPage.set_child(this._contentBox);

        this._guiPage = new Gtk.Box({ vexpand: true });
        this._guiBeat = new GuiBeatView();
        this._guiPage.append(this._guiBeat);

        this._practicePage = new Gtk.Box({ vexpand: true });
        this._practiceBeat = new PracticeBeatView({ vexpand: true });
        this._practiceBeat.connect('hint-revealed', () => this.emit('hint-revealed'));
        this._practiceBeat.connect('reset-requested', () => this.emit('reset-step'));
        this._practicePage.append(this._practiceBeat);

        this._terminalPage = new Gtk.Box({ vexpand: true });
        this._terminalBeat = null;
        this._terminalBeatPromise = null;

        this._stack.add_named(this._emptyPage, 'empty');
        this._stack.add_named(this._contentPage, 'content');
        this._stack.add_named(this._guiPage, 'gui');
        this._stack.add_named(this._practicePage, 'practice');
        this._stack.add_named(this._terminalPage, 'terminal');
        this._stack.visible_child_name = 'empty';
        this.append(this._stack);

        this._footer = new Gtk.Box({
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 24,
            margin_end: 24,
            halign: Gtk.Align.END,
        });
        this._continueButton = new Gtk.Button({
            label: _('Continue'),
            css_classes: ['suggested-action'],
        });
        this._continueButton.connect('clicked', () => this.emit('continue'));
        this._footer.append(this._continueButton);
        this.append(this._footer);
    }

    _connectTerminalBeat(beat) {
        beat.connect('validated', () => this.emit('validated'));
        beat.connect('hint-revealed', () => this.emit('hint-revealed'));
        beat.connect('reset-requested', () => this.emit('reset-step'));
        beat.connect('skip-requested', () => this.emit('continue'));
    }

    async _ensureTerminalBeat() {
        if (this._terminalBeat)
            return this._terminalBeat;

        if (!this._terminalBeatPromise) {
            this._terminalBeatPromise = (async () => {
                const { createTerminalBeat } = await import('./terminalBeat.js');
                const beat = await createTerminalBeat({ vexpand: true, hexpand: true });
                let child = this._terminalPage.get_first_child();
                while (child) {
                    const next = child.get_next_sibling();
                    this._terminalPage.remove(child);
                    child = next;
                }
                this._terminalPage.append(beat);
                this._terminalBeat = beat;
                this._connectTerminalBeat(beat);
                return beat;
            })();
        }

        return this._terminalBeatPromise;
    }

    setEngine(engine) {
        this._engine = engine;
    }

    setInstructionCard(card) {
        this._instructionCard = card;
        if (!card)
            return;

        card.connect('open-app', () => this._onGuiOpenApp());
        card.connect('next-phase', () => this._onGuiNextPhase());
        card.connect('done', () => this.emit('continue'));
        card.connect('hint-revealed', () => this.emit('hint-revealed'));
        card.connect('install-spotlight', () => this.emit('install-spotlight'));
    }

    _buildEmptyPage() {
        return new Adw.StatusPage({
            icon_name: 'folder-symbolic',
            title: _('Start with Files'),
            description: _('New to Linux? Open the Files and the filesystem track and begin with Opening Files (Nautilus). Each module teaches the same task in the GUI and the terminal.'),
            vexpand: true,
        });
    }

    _clearContentBox() {
        let child = this._contentBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._contentBox.remove(child);
            child = next;
        }
    }

    _syncGuiPhase(state) {
        if (!state)
            return;
        this._instructionCard?.onPhaseAdvanced(state.phaseIndex, state.phaseTotal, state.phase);
        const label = state.phase?.instruction ?? state.phase?.label ?? '';
        this._guiBeat.setPhaseProgress(state.phaseIndex, state.phaseTotal, label);
    }

    _onGuiOpenApp() {
        if (!this._engine || !this._module || !this._step)
            return;
        const state = this._engine.launchGuiApp(this._module, this._step);
        if (state) {
            this._instructionCard?.onAppOpened(state.phaseIndex, state.phaseTotal, state.phase);
            const label = state.phase?.instruction ?? state.phase?.label ?? '';
            this._guiBeat.setPhaseProgress(state.phaseIndex, state.phaseTotal, label);
        }
    }

    _onGuiNextPhase() {
        if (!this._engine)
            return;
        const state = this._engine.advanceGuiPhase();
        this._syncGuiPhase(state);
    }

    onGuiFixtureMatched(state) {
        if (!state || !this._step || (this._step.kind !== 'gui' && this._step.kind !== 'tour'))
            return;

        const isLast = state.phaseIndex + 1 >= state.phaseTotal;
        if (isLast)
            return;

        const next = this._engine.advanceGuiPhase();
        this._syncGuiPhase(next);
    }

    clear() {
        this._instructionCard?.dismiss();
        this._stack.visible_child_name = 'empty';
        this._footer.visible = false;
        this._terminalUnavailable = false;
        this._module = null;
        this._step = null;
        this._clearContentBox();
    }

    showModuleComplete(module, progressStore, onPracticeAgain) {
        this._instructionCard?.dismiss();
        this._footer.visible = false;
        this._stack.visible_child_name = 'content';
        this._clearContentBox();

        let hintTotal = 0;
        for (const step of module.steps)
            hintTotal += progressStore?.hintCount(`${module.track}/${module.module}/${step.id}`) ?? 0;

        const hintLine = hintTotal === 0
            ? _('You did not need any hints — nice work.')
            : ngettext(
                'You revealed %d hint during this module.',
                'You revealed %d hints during this module.',
                hintTotal,
            ).format(hintTotal);

        this._contentBox.append(new Adw.StatusPage({
            icon_name: 'object-select-symbolic',
            title: _('Module complete'),
            description: _('%1$s is done. %2$s Pick another module in the sidebar, or practice this one again.').format(
                module.title,
                hintLine,
            ),
            vexpand: true,
        }));

        const againButton = new Gtk.Button({
            label: _('Practice again'),
            css_classes: ['suggested-action'],
            halign: Gtk.Align.CENTER,
            margin_top: 12,
        });
        againButton.connect('clicked', () => onPracticeAgain());
        this._contentBox.append(againButton);
    }

    showStep(module, step, { stepIndex, stepTotal }) {
        this._module = module;
        this._step = step;
        this._terminalUnavailable = false;

        if (this._engine)
            this._engine.beginStep(module, step);

        if (step.kind === 'terminal' || step.kind === 'challenge') {
            this._stack.visible_child_name = 'terminal';
            const sandboxPath = step.sandbox === false
                ? null
                : this._engine?.sandboxPath(module, step);
            void this._ensureTerminalBeat().then(beat => {
                if (this._step !== step)
                    return;
                beat.reset(step, sandboxPath);
                this._terminalUnavailable = beat.constructor.$gtype.name === 'TerminalBeatUnavailable';
                this._footer.visible = true;
                if (this._terminalUnavailable)
                    this._continueButton.label = _('Continue without terminal');
                else
                    this._continueButton.label = stepIndex + 1 >= stepTotal ? _('Finish module') : _('Continue');
            });
            return;
        }

        if (step.kind === 'practice') {
            this._stack.visible_child_name = 'practice';
            this._footer.visible = true;
            this._continueButton.label = stepIndex + 1 >= stepTotal ? _('Finish module') : _('Continue');
            const sandboxPath = this._engine?.practicePath(module, step);
            void this._practiceBeat.showPractice(step, sandboxPath);
            return;
        }

        this._footer.visible = step.kind !== 'gui' && step.kind !== 'tour';
        this._continueButton.label = stepIndex + 1 >= stepTotal ? _('Finish module') : _('Continue');

        if (step.kind === 'contrast') {
            this._instructionCard?.dismiss();
            this._stack.visible_child_name = 'content';
            this._clearContentBox();
            const contrast = new ContrastBeatView({ vexpand: true });
            contrast.setStep(module, step);
            contrast.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._contentBox.append(new Gtk.Label({
                label: _('%1$s · Step %2$d of %3$d').format(kindLabel(step.kind), stepIndex + 1, stepTotal),
                css_classes: ['dim-label'],
                halign: Gtk.Align.START,
            }));
            this._contentBox.append(contrast);
            return;
        }

        if (step.kind === 'tour') {
            this._stack.visible_child_name = 'gui';
            const spotlightAvailable = this._engine?.spotlight.available ?? false;
            this._guiBeat.reset(module, step, { spotlightAvailable, tour: true });
            this._instructionCard?.presentTour(module, step, {
                spotlightAvailable,
                stepIndex,
                stepTotal,
            });
            const state = this._engine.beginTour(module, step);
            if (state) {
                this._instructionCard?.onAppOpened(state.phaseIndex, state.phaseTotal, state.phase);
                const label = state.phase?.instruction ?? state.phase?.label ?? '';
                this._guiBeat.setPhaseProgress(state.phaseIndex, state.phaseTotal, label);
            }
            return;
        }

        if (step.kind === 'gui') {
            this._stack.visible_child_name = 'gui';
            const spotlightAvailable = this._engine?.spotlight.available ?? false;
            this._guiBeat.reset(module, step, { spotlightAvailable });
            this._instructionCard?.presentStep(module, step, {
                spotlightAvailable,
                stepIndex,
                stepTotal,
            });
            this._onGuiOpenApp();
            return;
        }

        if (step.kind === 'bridge') {
            this._instructionCard?.dismiss();
            this._stack.visible_child_name = 'content';
            this._clearContentBox();
            this._contentBox.append(new Gtk.Label({
                label: _('%1$s · Step %2$d of %3$d').format(kindLabel(step.kind), stepIndex + 1, stepTotal),
                css_classes: ['dim-label'],
                halign: Gtk.Align.START,
            }));
            const bridge = new BridgeBeatView({ vexpand: true });
            bridge.setStep(module, step);
            bridge.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._contentBox.append(bridge);
            return;
        }

        this._instructionCard?.dismiss();
        this._stack.visible_child_name = 'content';
        this._clearContentBox();
    }
});
