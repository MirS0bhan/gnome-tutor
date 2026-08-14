/* stepView.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { bridgeButtonLabel } from '../engine/journeyHelpers.js';
import { GuiBeatView } from './guiBeatView.js';
import { ContrastBeatView } from './contrastBeatView.js';
import { BridgeBeatView } from './bridgeBeatView.js';
import { PracticeBeatView } from './practiceBeatView.js';
import { TourBeatView } from './tourBeatView.js';

export const StepView = GObject.registerClass({
    GTypeName: 'StepView',
    Signals: {
        'continue': {},
        'validated': {},
        'hint-revealed': {},
        'reset-step': {},
        'reset-practice': {},
        'install-spotlight': {},
        'tour-continue': {},
        'tour-next-phase': {},
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
        this._curriculum = null;
        this._module = null;
        this._step = null;
        this._terminalValidated = false;

        this._stack = new Gtk.Stack({ vexpand: true, hexpand: true });
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

        this._tourBeat = new TourBeatView({ vexpand: true });
        this._tourBeat.connect('continue', () => this.emit('tour-continue'));
        this._tourBeat.connect('next-phase', () => this.emit('tour-next-phase'));
        this._tourBeat.connect('hint-revealed', () => this.emit('hint-revealed'));

        this._practicePage = new Gtk.Box({ vexpand: true });
        this._practiceBeat = new PracticeBeatView({ vexpand: true });
        this._practiceBeat.connect('hint-revealed', () => this.emit('hint-revealed'));
        this._practiceBeat.connect('reset-requested', () => this.emit('reset-practice'));
        this._practicePage.append(this._practiceBeat);

        this._terminalPage = new Gtk.Box({ vexpand: true });
        this._terminalBeat = null;

        this._stack.add_named(this._contentPage, 'content');
        this._stack.add_named(this._guiPage, 'gui');
        this._stack.add_named(this._tourBeat, 'tour');
        this._stack.add_named(this._practicePage, 'practice');
        this._stack.add_named(this._terminalPage, 'terminal');
        this._stack.visible_child_name = 'content';
        this.append(this._stack);

        this._footer = new Gtk.Box({
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 24,
            margin_end: 24,
        });
        this._continueButton = new Gtk.Button({
            label: _('Continue'),
            css_classes: ['suggested-action'],
        });
        this._continueButton.connect('clicked', () => this.emit('continue'));
        this._footer.append(this._continueButton);
        this.append(this._footer);
    }

    setCurriculum(curriculum) {
        this._curriculum = curriculum;
    }

    setCurriculumProvider(fn) {
        this._curriculumProvider = fn;
    }

    _curriculumRef() {
        return this._curriculum ?? this._curriculumProvider?.() ?? null;
    }

    async _ensureTerminalBeat() {
        if (this._terminalBeat)
            return this._terminalBeat;
        const { createTerminalBeat } = await import('./terminalBeat.js');
        const beat = await createTerminalBeat({ vexpand: true, hexpand: true });
        this._terminalPage.append(beat);
        this._terminalBeat = beat;
        beat.connect('validated', () => {
            this._terminalValidated = true;
            this._updateTerminalFooter();
            this.emit('validated');
        });
        beat.connect('hint-revealed', () => this.emit('hint-revealed'));
        beat.connect('reset-requested', () => this.emit('reset-step'));
        beat.connect('skip-requested', () => this.emit('continue'));
        return beat;
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

    _clearContentBox() {
        let child = this._contentBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._contentBox.remove(child);
            child = next;
        }
    }

    _appendBreadcrumb(breadcrumb) {
        if (!breadcrumb)
            return;
        this._contentBox.append(new Gtk.Label({
            label: breadcrumb,
            css_classes: ['dim-label'],
            halign: Gtk.Align.START,
        }));
    }

    _updateTerminalFooter() {
        if (this._terminalValidated) {
            this._continueButton.remove_css_class('flat');
            this._continueButton.add_css_class('suggested-action');
            this._continueButton.sensitive = true;
        } else {
            this._continueButton.add_css_class('flat');
            this._continueButton.remove_css_class('suggested-action');
            this._continueButton.sensitive = true;
        }
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
        const state = this._engine?.advanceGuiPhase();
        if (!state)
            return;
        this._instructionCard?.onPhaseAdvanced(state.phaseIndex, state.phaseTotal, state.phase);
        const label = state.phase?.instruction ?? state.phase?.label ?? '';
        this._guiBeat.setPhaseProgress(state.phaseIndex, state.phaseTotal, label);
    }

    onGuiFixtureMatched(state) {
        if (!state || !this._step || this._step.kind !== 'gui')
            return;
        const isLast = state.phaseIndex + 1 >= state.phaseTotal;
        if (isLast)
            return;
        const next = this._engine.advanceGuiPhase();
        this._instructionCard?.onPhaseAdvanced(next.phaseIndex, next.phaseTotal, next.phase);
        this._guiBeat.setPhaseProgress(next.phaseIndex, next.phaseTotal, next.phase?.instruction ?? '');
    }

    syncTourPhase(state) {
        if (!state)
            return;
        this._tourBeat.setPhase(state.phaseIndex, state.phaseTotal, state.phase, {
            detectComplete: state.phaseIndex > 0,
        });
    }

    onTourOverviewOpened() {
        this._tourBeat.showDetectComplete(_(
            'There it is — the Activities overview. You can see all your open windows and search for apps from here. Press Escape or click anywhere empty to close it, then come back to this window.',
        ));
    }

    clear() {
        this._instructionCard?.dismiss();
        this._stack.visible_child_name = 'content';
        this._footer.visible = false;
        this._module = null;
        this._step = null;
        this._clearContentBox();
    }

    showStep(module, step, { stepIndex, stepTotal, breadcrumb }) {
        this._module = module;
        this._step = step;
        this._terminalValidated = false;
        this._footer.halign = Gtk.Align.END;

        if (this._engine)
            this._engine.beginStep(module, step);

        if (step.kind === 'terminal' || step.kind === 'challenge') {
            this._stack.visible_child_name = 'terminal';
            this._footer.visible = true;
            this._continueButton.label = _('Next');
            this._updateTerminalFooter();
            const sandboxPath = step.sandbox === false ? null : this._engine?.sandboxPath(module, step);
            void this._ensureTerminalBeat().then(beat => {
                if (this._step !== step)
                    return;
                beat.reset(step, sandboxPath);
                if (step.validate?.pattern)
                    beat.scheduleHintBadge?.();
            });
            return;
        }

        if (step.kind === 'practice') {
            this._stack.visible_child_name = 'practice';
            this._footer.visible = false;
            void this._practiceBeat.showPractice(step, this._engine?.practicePath(module, step));
            return;
        }

        if (step.kind === 'contrast') {
            this._instructionCard?.dismiss();
            this._stack.visible_child_name = 'content';
            this._clearContentBox();
            this._appendBreadcrumb(breadcrumb);
            const contrast = new ContrastBeatView({ vexpand: true });
            contrast.setStep(module, step);
            contrast.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._contentBox.append(contrast);
            this._footer.visible = true;
            this._continueButton.label = _('Continue');
            this._footer.halign = Gtk.Align.END;
            return;
        }

        if (step.kind === 'tour') {
            this._instructionCard?.dismiss();
            this._stack.visible_child_name = 'tour';
            this._footer.visible = false;
            this._tourBeat.setBreadcrumb(breadcrumb);
            this._tourBeat.setStep(step);
            const state = this._engine.beginTour(module, step);
            this._tourBeat.setPhase(state.phaseIndex, state.phaseTotal, state.phase, {
                awaitingDetect: state.phaseIndex === 0,
            });
            return;
        }

        if (step.kind === 'gui') {
            this._stack.visible_child_name = 'gui';
            this._footer.visible = false;
            const spotlightAvailable = this._engine?.spotlight.available ?? false;
            this._guiBeat.reset(module, step, { spotlightAvailable });
            this._instructionCard?.presentStep(module, step, {
                spotlightAvailable,
                stepIndex,
                stepTotal,
                breadcrumb,
            });
            this._onGuiOpenApp();
            return;
        }

        if (step.kind === 'bridge') {
            this._instructionCard?.dismiss();
            this._stack.visible_child_name = 'content';
            this._clearContentBox();
            this._appendBreadcrumb(breadcrumb);
            const bridge = new BridgeBeatView({ vexpand: true });
            bridge.setStep(module, step);
            bridge.connect('hint-revealed', () => this.emit('hint-revealed'));
            this._contentBox.append(bridge);
            this._footer.visible = true;
            this._footer.halign = Gtk.Align.CENTER;
            this._continueButton.label = bridgeButtonLabel(step, module, this._curriculumRef());
            return;
        }

        this._instructionCard?.dismiss();
        this._stack.visible_child_name = 'content';
        this._clearContentBox();
    }
});
