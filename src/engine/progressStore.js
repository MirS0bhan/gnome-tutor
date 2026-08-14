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
        this.welcomeSeen = false;
        this.lastLocationJson = '';
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

    isWelcomeSeen() {
        if (this._memory)
            return this._memory.welcomeSeen;
        try {
            return this._settings.get_boolean('welcome-seen');
        } catch {
            return false;
        }
    }

    markWelcomeSeen() {
        if (this._memory) {
            this._memory.welcomeSeen = true;
            return;
        }
        this._settings.set_boolean('welcome-seen', true);
    }

    saveLastLocation({ track, module, stepIndex }) {
        const payload = JSON.stringify({ track, module, stepIndex });
        if (this._memory) {
            this._memory.lastLocationJson = payload;
            return;
        }
        this._settings.set_string('last-location-json', payload);
    }

    loadLastLocation() {
        const raw = this._memory
            ? this._memory.lastLocationJson
            : this._settings.get_string('last-location-json');
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
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

    clearModuleProgress(module) {
        const prefix = `${module.track}/${module.module}/`;
        const moduleKey = `${module.track}/${module.module}`;
        const steps = this._getCompletedSteps().filter(id => !id.startsWith(prefix));
        this._setCompletedSteps(steps);

        const modules = this._getCompletedModules().filter(id => id !== moduleKey);
        this._setCompletedModules(modules);

        for (const step of module.steps) {
            const stepId = `${module.track}/${module.module}/${step.id}`;
            delete this._hintCounts[stepId];
        }
        this._saveHintCounts();
    }

    clearAllProgress() {
        this._setCompletedSteps([]);
        this._setCompletedModules([]);
        this._hintCounts = {};
        this._saveHintCounts();
    }

    moduleProgress(module) {
        const completedSteps = module.steps.filter(step =>
            this.isStepCompleted(`${module.track}/${module.module}/${step.id}`));
        const started = completedSteps.length > 0;
        return {
            completed: completedSteps.length,
            total: module.steps.length,
            done: completedSteps.length === module.steps.length,
            started,
        };
    }

    trackProgress(track) {
        if (!track?.modules?.length)
            return { completed: 0, total: 0, done: false, started: false, fraction: 0 };

        const total = track.modules.length;
        const completed = track.modules.filter(module =>
            this.isModuleCompleted(`${module.track}/${module.module}`)).length;
        const started = track.modules.some(module => {
            const progress = this.moduleProgress(module);
            return progress.started || progress.done;
        });
        return {
            completed,
            total,
            done: completed === total,
            started,
            fraction: total > 0 ? completed / total : 0,
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
