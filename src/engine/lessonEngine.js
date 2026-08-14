/* lessonEngine.js — coordinates step lifecycle across beats.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AppLauncher } from './appLauncher.js';
import { SandboxManager } from './sandboxManager.js';
import { SpotlightClient } from './spotlightClient.js';

export class LessonEngine {
    constructor({ progressStore }) {
        this.progressStore = progressStore;
        this.sandbox = new SandboxManager();
        this.spotlight = new SpotlightClient();
        this._instructionCard = null;
        this._activeGuiStep = null;
    }

    setInstructionCard(window) {
        this._instructionCard = window;
    }

    stepKey(module, step) {
        return `${module.track}/${module.module}/${step.id}`;
    }

    beginStep(module, step) {
        this.endStep();

        if (step.fixture) {
            try {
                this.sandbox.provision(module, step);
            } catch (error) {
                console.error(error.message);
            }
        }

        if (step.kind === 'gui')
            this._beginGuiStep(module, step);
    }

    endStep() {
        this.spotlight.clear();
        this._activeGuiStep = null;
        if (this._instructionCard?.visible)
            this._instructionCard.hide();
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

    _beginGuiStep(module, step) {
        this._activeGuiStep = step;
        const path = this.sandbox.sandboxPath(module, step);

        try {
            AppLauncher.launch(step, path);
        } catch (error) {
            console.error(`Failed to launch ${step.target_app}: ${error.message}`);
        }

        if (this._instructionCard)
            this._instructionCard.presentInstruction(step);

        const highlighted = this.spotlight.highlightWindow('Org.gnome.Nautilus', step.instruction);
        if (!highlighted && step.spotlight?.length) {
            const anchor = step.spotlight[0];
            if (anchor.x !== undefined)
                this.spotlight.highlight(anchor.x, anchor.y, anchor.w, anchor.h, step.instruction);
        }
    }
}
