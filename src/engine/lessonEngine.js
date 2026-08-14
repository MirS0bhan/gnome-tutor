/* lessonEngine.js — coordinates step lifecycle across beats.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { AppLauncher } from './appLauncher.js';
import { FixtureWatcher } from './fixtureWatcher.js';
import { SandboxManager } from './sandboxManager.js';
import { SpotlightClient } from './spotlightClient.js';
import {
    applySpotlight,
    spotlightForPhase,
} from './spotlightAnchors.js';

const NAUTILUS_WM_HINTS = ['nautilus', 'org.gnome.nautilus'];

export class LessonEngine {
    constructor({ progressStore, onGuiFixtureMatched, onTourOverviewOpened }) {
        this.progressStore = progressStore;
        this.sandbox = new SandboxManager();
        this.spotlight = new SpotlightClient();
        this._fixtureWatcher = new FixtureWatcher();
        this._onGuiFixtureMatched = onGuiFixtureMatched ?? null;
        this._onTourOverviewOpened = onTourOverviewOpened ?? null;
        this._activeGuiStep = null;
        this._guiPhaseIndex = -1;
        this._spotlightRetrySource = 0;
        this._spotlightActive = false;
        this._guiFixtureMatched = false;
        this._spawnedProcess = null;
        this._tourDetectSource = 0;
        this._tourOverviewDetected = false;
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
        } else if (step.fixture && step.sandbox !== false) {
            try {
                this.sandbox.provision(module, step);
            } catch (error) {
                console.error(error.message);
            }
        }

        if (step.spawn_process)
            this._spawnDummyProcess();
    }

    practicePath(module, step) {
        return this.sandbox.provisionPractice(module, step?.fixture);
    }

    endStep() {
        this._cancelSpotlightRetry();
        this._cancelTourDetect();
        this._fixtureWatcher.clear();
        this._killDummyProcess();
        this.spotlight.clear();
        this._activeGuiStep = null;
        this._guiPhaseIndex = -1;
        this._spotlightActive = false;
        this._guiFixtureMatched = false;
        this._tourOverviewDetected = false;
    }

    resetPractice(module, step) {
        return this.sandbox.resetPractice(module, step?.fixture);
    }

    sandboxPath(module, step) {
        if (step.sandbox === false)
            return null;
        if (step.fixture)
            return this.sandbox.sandboxPath(module, step);
        return null;
    }

    resetStep(module, step) {
        if (!step.fixture || step.sandbox === false)
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

        const path = step.fixture ? this.sandbox.sandboxPath(module, step) : null;
        if (step.target_app) {
            try {
                AppLauncher.launch(step, path);
            } catch (error) {
                console.error(`Failed to launch ${step.target_app}: ${error.message}`);
            }
        }

        this._applyGuiPhase(false, 0);
        this._startFixtureWatch(module, step, path);
        return this.currentGuiPhaseState();
    }

    beginTour(module, step) {
        this._activeGuiStep = { module, step };
        this._guiPhaseIndex = 0;
        this._tourOverviewDetected = false;
        this._applyGuiPhase(false, 0);
        this._startTourOverviewDetect();
        return this.currentGuiPhaseState();
    }

    advanceGuiPhase() {
        if (!this._activeGuiStep)
            return null;

        const phases = this.guiPhases(this._activeGuiStep.step);
        if (this._guiPhaseIndex + 1 >= phases.length)
            return this.currentGuiPhaseState();

        this._guiPhaseIndex++;
        this.spotlight.clear();
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
        const spotlightList = spotlightForPhase(phase, step);
        const spotlightIndex = Math.min(this._guiPhaseIndex, Math.max(spotlightList.length - 1, 0));

        if (isAdvance && this._spotlightActive && this.spotlight.updateLabel(label))
            return;

        let highlighted = false;

        if (spotlightList.length > 0) {
            const entry = spotlightList[spotlightIndex] ?? spotlightList[0];
            if (applySpotlight(this.spotlight, entry, label))
                highlighted = true;
        }

        if (!highlighted && step.target_app) {
            const wmHints = this._wmClassHints(step);
            for (const hint of wmHints) {
                if (this.spotlight.highlightWindow(hint, label)) {
                    highlighted = true;
                    break;
                }
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

    _cancelTourDetect() {
        if (this._tourDetectSource) {
            GLib.source_remove(this._tourDetectSource);
            this._tourDetectSource = 0;
        }
    }

    _startTourOverviewDetect() {
        this._cancelTourDetect();
        let attempts = 0;
        const poll = () => {
            if (!this._activeGuiStep || this._tourOverviewDetected)
                return GLib.SOURCE_REMOVE;

            if (this.spotlight.isOverviewOpen?.()) {
                this._tourOverviewDetected = true;
                this.spotlight.clear();
                if (this._onTourOverviewOpened)
                    this._onTourOverviewOpened();
                return GLib.SOURCE_REMOVE;
            }

            attempts++;
            if (attempts >= 25) {
                if (this._onTourOverviewOpened)
                    this._onTourOverviewOpened();
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        };
        this._tourDetectSource = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, poll);
    }

    _cancelSpotlightRetry() {
        if (this._spotlightRetrySource) {
            GLib.source_remove(this._spotlightRetrySource);
            this._spotlightRetrySource = 0;
        }
    }

    _startFixtureWatch(module, step, sandboxPath) {
        this._fixtureWatcher.clear();
        this._guiFixtureMatched = false;

        const existsPath = step.validate?.exists;
        if (!existsPath || !sandboxPath)
            return;

        const targetPath = GLib.build_filenamev([sandboxPath, existsPath]);
        const notifyMatch = () => {
            if (this._guiFixtureMatched)
                return;
            if (!Gio.File.new_for_path(targetPath).query_exists(null))
                return;

            this._guiFixtureMatched = true;
            this._fixtureWatcher.clear();
            if (this._onGuiFixtureMatched)
                this._onGuiFixtureMatched(this.currentGuiPhaseState());
        };

        if (Gio.File.new_for_path(targetPath).query_exists(null)) {
            notifyMatch();
            return;
        }

        this._fixtureWatcher.watch(sandboxPath, notifyMatch);
    }

    _spawnDummyProcess() {
        this._killDummyProcess();
        try {
            this._spawnedProcess = Gio.Subprocess.new(
                ['bash', '-c', 'exec -a academy-dummy-process sleep 3600'],
                Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE,
            );
        } catch (error) {
            console.error(`Failed to spawn dummy process: ${error.message}`);
        }
    }

    _killDummyProcess() {
        if (!this._spawnedProcess)
            return;
        try {
            this._spawnedProcess.force_exit();
        } catch {
            // ignore
        }
        this._spawnedProcess = null;
        try {
            Gio.Subprocess.new(
                ['pkill', '-f', 'academy-dummy-process'],
                Gio.SubprocessFlags.NONE,
            );
        } catch {
            // ignore
        }
    }
}
