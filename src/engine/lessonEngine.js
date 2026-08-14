/* lessonEngine.js — coordinates step lifecycle across beats.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';

import { AppLauncher } from './appLauncher.js';
import { FixtureWatcher } from './fixtureWatcher.js';
import { SandboxManager } from './sandboxManager.js';
import { SpotlightClient } from './spotlightClient.js';
import { resolveSpotlightList } from './spotlightAnchors.js';

const NAUTILUS_WM_HINTS = ['nautilus', 'org.gnome.nautilus'];

export class LessonEngine {
    constructor({ progressStore }) {
        this.progressStore = progressStore;
        this.sandbox = new SandboxManager();
        this.spotlight = new SpotlightClient();
        this._activeGuiStep = null;
        this._guiPhaseIndex = -1;
        this._spotlightRetrySource = 0;
        this._spotlightActive = false;
        this.fixtureWatcher = new FixtureWatcher();
        this._onFixtureDetected = null;
    }

    setFixtureDetectedCallback(callback) {
        this._onFixtureDetected = callback;
    }

    stepKey(module, step) {
        return `${module.track}/${module.module}/${step.id}`;
    }

    beginStep(module, step) {
        this.endStep();

        if (step.kind === 'practice') {
            try {
                this.sandbox.provisionPractice(module, step.fixture);
            } catch (error) {
                console.error(error.message);
            }
        } else if (step.fixture) {
            try {
                this.sandbox.provision(module, step);
            } catch (error) {
                console.error(error.message);
            }
        }

        if (step.kind === 'gui' && step.watch_file) {
            const sandboxPath = this.sandboxPath(module, step);
            if (sandboxPath) {
                const watchPath = GLib.build_filenamev([sandboxPath, step.watch_file]);
                this.fixtureWatcher.watch(watchPath, () => {
                    if (this._onFixtureDetected)
                        this._onFixtureDetected();
                });
            }
        }
    }

    practicePath(module, step) {
        return this.sandbox.provisionPractice(module, step?.fixture);
    }

    endStep() {
        this.fixtureWatcher.clear();
        this._cancelSpotlightRetry();
        this.spotlight.clear();
        this._activeGuiStep = null;
        this._guiPhaseIndex = -1;
        this._spotlightActive = false;
    }

    sandboxPath(module, step) {
        if (step.fixture)
            return this.sandbox.sandboxPath(module, step);
        return null;
    }

    resetStep(module, step) {
        if (!step.fixture)
            return null;
        return this.sandbox.reset(module, step);
    }

    guiPhases(step) {
        if (step.phases?.length)
            return step.phases;
        return [{
            instruction: step.instruction,
            label: step.instruction,
        }];
    }

    launchGuiApp(module, step) {
        this._activeGuiStep = { module, step };
        this._guiPhaseIndex = 0;

        const path = this.sandbox.sandboxPath(module, step);
        try {
            AppLauncher.launch(step, path);
        } catch (error) {
            console.error(`Failed to launch ${step.target_app}: ${error.message}`);
        }

        this._applyGuiPhase(false, 0);
        return this.currentGuiPhaseState();
    }

    advanceGuiPhase() {
        if (!this._activeGuiStep)
            return null;

        const phases = this.guiPhases(this._activeGuiStep.step);
        if (this._guiPhaseIndex + 1 >= phases.length)
            return this.currentGuiPhaseState();

        this._guiPhaseIndex++;
        this._applyGuiPhase(true);
        return this.currentGuiPhaseState();
    }

    currentGuiPhaseState() {
        if (!this._activeGuiStep)
            return null;

        const phases = this.guiPhases(this._activeGuiStep.step);
        return {
            phaseIndex: this._guiPhaseIndex,
            phaseTotal: phases.length,
            phase: phases[this._guiPhaseIndex] ?? phases[0],
            appOpened: this._guiPhaseIndex >= 0,
        };
    }

    _wmClassHints(step) {
        if (step.target_app === 'org.gnome.Nautilus')
            return NAUTILUS_WM_HINTS;
        const appId = step.target_app ?? '';
        const short = appId.split('.').pop()?.toLowerCase();
        return [short, appId.toLowerCase()].filter(Boolean);
    }

    _phaseSpotlightLabel(phase) {
        return phase.label ?? phase.instruction ?? '';
    }

    _applyGuiPhase(isAdvance = false, retry = 0) {
        if (!this._activeGuiStep)
            return;

        const { step } = this._activeGuiStep;
        const phases = this.guiPhases(step);
        const phase = phases[this._guiPhaseIndex];
        const label = this._phaseSpotlightLabel(phase);

        if (isAdvance && this._spotlightActive && this.spotlight.updateLabel(label))
            return;

        const wmHints = this._wmClassHints(step);

        let highlighted = false;
        for (const hint of wmHints) {
            if (this.spotlight.highlightWindow(hint, label)) {
                highlighted = true;
                break;
            }
        }

        if (!highlighted && retry === 0 && step.spotlight?.length) {
            const anchor = resolveSpotlightList(step.spotlight);
            if (anchor?.x !== undefined) {
                this.spotlight.highlight(anchor.x, anchor.y, anchor.w, anchor.h, label);
                highlighted = true;
            }
        }

        this._spotlightActive = highlighted;

        if (!highlighted && retry < 10) {
            this._cancelSpotlightRetry();
            this._spotlightRetrySource = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                400,
                () => {
                    this._spotlightRetrySource = 0;
                    if (this._activeGuiStep)
                        this._applyGuiPhase(false, retry + 1);
                    return GLib.SOURCE_REMOVE;
                },
            );
        } else if (highlighted && retry > 0) {
            this._cancelSpotlightRetry();
        }
    }

    _cancelSpotlightRetry() {
        if (this._spotlightRetrySource) {
            GLib.source_remove(this._spotlightRetrySource);
            this._spotlightRetrySource = 0;
        }
    }
}
