/* progressStore.js
 *
 * Local progress persistence backed by GSettings (Phase 0).
 * The interface is stable so a SQLite backend can replace it later.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';

const SCHEMA_ID = 'ir.urumlug.gnomeTutor';

class MemoryProgressBackend {
    constructor() {
        this.completedSteps = new Set();
        this.completedModules = new Set();
        this.hintCounts = {};
    }
}

export class ProgressStore {
    constructor(settings = null) {
        this._memory = null;

        if (settings) {
            this._settings = settings;
        } else {
            try {
                this._settings = new Gio.Settings({ schema_id: SCHEMA_ID });
            } catch {
                this._settings = null;
                this._memory = new MemoryProgressBackend();
            }
        }

        this._hintCounts = this._loadHintCounts();
    }

    _loadHintCounts() {
        if (this._memory)
            return { ...this._memory.hintCounts };

        const raw = this._settings.get_string('hint-counts-json');
        if (!raw)
            return {};
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    _saveHintCounts() {
        if (this._memory) {
            this._memory.hintCounts = { ...this._hintCounts };
            return;
        }
        this._settings.set_string('hint-counts-json', JSON.stringify(this._hintCounts));
    }

    _getCompletedSteps() {
        if (this._memory)
            return [...this._memory.completedSteps];
        return this._settings.get_strv('completed-steps');
    }

    _setCompletedSteps(values) {
        if (this._memory) {
            this._memory.completedSteps = new Set(values);
            return;
        }
        this._settings.set_strv('completed-steps', values);
    }

    _getCompletedModules() {
        if (this._memory)
            return [...this._memory.completedModules];
        return this._settings.get_strv('completed-modules');
    }

    _setCompletedModules(values) {
        if (this._memory) {
            this._memory.completedModules = new Set(values);
            return;
        }
        this._settings.set_strv('completed-modules', values);
    }

    isStepCompleted(stepId) {
        return this._getCompletedSteps().includes(stepId);
    }

    isModuleCompleted(moduleKey) {
        return this._getCompletedModules().includes(moduleKey);
    }

    markStepCompleted(stepId) {
        const completed = new Set(this._getCompletedSteps());
        completed.add(stepId);
        this._setCompletedSteps([...completed]);
    }

    markModuleCompleted(moduleKey) {
        const completed = new Set(this._getCompletedModules());
        completed.add(moduleKey);
        this._setCompletedModules([...completed]);
    }

    moduleProgress(module) {
        const completedSteps = module.steps.filter(step =>
            this.isStepCompleted(`${module.track}/${module.module}/${step.id}`));
        return {
            completed: completedSteps.length,
            total: module.steps.length,
            done: completedSteps.length === module.steps.length,
        };
    }

    recordHintReveal(stepId) {
        this._hintCounts[stepId] = (this._hintCounts[stepId] ?? 0) + 1;
        this._saveHintCounts();
    }

    hintCount(stepId) {
        return this._hintCounts[stepId] ?? 0;
    }

    moduleHintTotal(module) {
        return module.step_ids.reduce((sum, stepId) => sum + (this._hintCounts[stepId] ?? 0), 0);
    }
}
