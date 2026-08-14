/* window.js
 *
 * Copyright 2026 misano
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ContentLoader } from './engine/contentLoader.js';
import { ProgressStore } from './engine/progressStore.js';
import { CurriculumSidebar } from './widgets/curriculumSidebar.js';
import { StepView } from './widgets/stepView.js';

export const GnomeTutorWindow = GObject.registerClass({
    GTypeName: 'GnomeTutorWindow',
    Template: 'resource:///ir/urumlug/gnomeTutor/window.ui',
    InternalChildren: ['split_view', 'header_title', 'sidebar_scrolled', 'content_box'],
}, class GnomeTutorWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application });

        this._progressStore = new ProgressStore();
        this._curriculum = null;
        this._activeModule = null;
        this._activeStepIndex = 0;

        this._sidebar = new CurriculumSidebar({ vexpand: true });
        this._stepView = new StepView({ vexpand: true });

        this._sidebar_scrolled.set_child(this._sidebar);
        this._content_box.append(this._stepView);

        this._sidebar.setProgressStore(this._progressStore);
        this._sidebar.connect('module-selected', (_sidebar, module) => {
            this._openModule(module);
        });
        this._sidebar.connect('step-selected', (_sidebar, module, step) => {
            this._openStep(module, step);
        });
        this._stepView.connect('continue', () => this._advanceStep());

        this._loadCurriculum();
    }

    _loadCurriculum() {
        try {
            const loader = new ContentLoader(ContentLoader.defaultContentRoot());
            this._curriculum = loader.load();
            this._sidebar.setCurriculum(this._curriculum);
        } catch (error) {
            console.error(`Failed to load curriculum: ${error.message}`);
            this._showLoadError(error.message);
        }
    }

    _showLoadError(message) {
        const page = new Adw.StatusPage({
            icon_name: 'dialog-error-symbolic',
            title: _('Could not load curriculum'),
            description: message,
        });
        this._stepView.clear();
        this._content_box.append(page);
    }

    _openModule(module) {
        this._activeModule = module;
        this._activeStepIndex = 0;
        this._header_title.subtitle = module.title;
        this._sidebar.selectModule(module);
        this._renderActiveStep();
    }

    _openStep(module, step) {
        this._activeModule = module;
        this._activeStepIndex = module.steps.findIndex(item => item.id === step.id);
        if (this._activeStepIndex < 0)
            this._activeStepIndex = 0;
        this._header_title.subtitle = module.title;
        this._sidebar.selectModule(module);
        this._renderActiveStep();
    }

    _renderActiveStep() {
        if (!this._activeModule)
            return;

        const step = this._activeModule.steps[this._activeStepIndex];
        this._stepView.showStep(this._activeModule, step, {
            stepIndex: this._activeStepIndex,
            stepTotal: this._activeModule.steps.length,
        });
    }

    _advanceStep() {
        if (!this._activeModule)
            return;

        const step = this._activeModule.steps[this._activeStepIndex];
        const stepKey = `${this._activeModule.track}/${this._activeModule.module}/${step.id}`;
        this._progressStore.markStepCompleted(stepKey);

        if (this._activeStepIndex + 1 >= this._activeModule.steps.length) {
            this._progressStore.markModuleCompleted(`${this._activeModule.track}/${this._activeModule.module}`);
            this._sidebar.setCurriculum(this._curriculum);
            this._header_title.subtitle = _('Module complete');
            this._activeModule = null;
            this._stepView.clear();
            return;
        }

        this._activeStepIndex++;
        this._sidebar.setCurriculum(this._curriculum);
        this._renderActiveStep();
    }
});
