/* window.js
 *
 * Copyright 2026 misano
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ContentLoader } from './engine/contentLoader.js';
import { ExtensionInstaller } from './engine/extensionInstaller.js';
import { LessonEngine } from './engine/lessonEngine.js';
import { ProgressStore } from './engine/progressStore.js';
import { CurriculumSidebar } from './widgets/curriculumSidebar.js';
import { InstructionCardWindow } from './widgets/instructionCardWindow.js';
import { StepView } from './widgets/stepView.js';

export const GnomeTutorWindow = GObject.registerClass({
    GTypeName: 'GnomeTutorWindow',
}, class GnomeTutorWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({
            application,
            title: _('GNOME Linux Academy'),
            default_width: 960,
            default_height: 640,
        });

        this._progressStore = new ProgressStore();
        this._curriculum = null;
        this._activeModule = null;
        this._lastModule = null;
        this._activeStepIndex = 0;

        this._buildUi();
        this._registerActions();

        this._sidebar = new CurriculumSidebar({ vexpand: true, hexpand: true });
        this._stepView = new StepView({ vexpand: true, hexpand: true });
        this._lessonEngine = new LessonEngine({
            progressStore: this._progressStore,
            onGuiFixtureMatched: state => this._stepView.onGuiFixtureMatched(state),
        });
        this._stepView.setEngine(this._lessonEngine);

        this._instructionCard = new InstructionCardWindow({ application });
        this._instructionCard.set_transient_for(this);
        this._stepView.setInstructionCard(this._instructionCard);

        this._sidebar_scrolled.set_child(this._sidebar);

        this._contentPage = new Adw.NavigationPage({
            title: _('Lesson'),
            child: this._stepView,
        });
        this._splitView.content = this._contentPage;

        this._sidebar.setProgressStore(this._progressStore);
        this._sidebar.connect('module-selected', () => {
            this._openModule(this._sidebar.selectedModule);
        });
        this._sidebar.connect('step-selected', () => {
            this._openStep(this._sidebar.selectedModule, this._sidebar.selectedStep);
        });
        this._stepView.connect('continue', () => this._advanceStep());
        this._stepView.connect('validated', () => this._onStepValidated());
        this._stepView.connect('hint-revealed', () => this._recordHint());
        this._stepView.connect('reset-step', () => this._resetActiveStep());
        this._stepView.connect('install-spotlight', () => this._installSpotlightExtension());

        this._loadCurriculum();
    }

    _buildUi() {
        this._header_title = new Adw.WindowTitle({
            title: _('GNOME Linux Academy'),
            subtitle: _('Learn Linux through real GUI and terminal tools'),
        });

        const header = new Adw.HeaderBar();
        header.set_title_widget(this._header_title);

        const menu = Gio.Menu.new();
        const section = Gio.Menu.new();
        section.append(_('Install Spotlight Extension'), 'win.install-spotlight');
        section.append(_('Reset Module Progress'), 'win.reset-module');
        section.append(_('Reset All Progress'), 'win.reset-all-progress');
        section.append(_('About GNOME Linux Academy'), 'app.about');
        section.append(_('Keyboard Shortcuts'), 'win.show-help-overlay');
        section.append(_('Quit'), 'app.quit');
        menu.append_section(null, section);

        const menuButton = new Gtk.MenuButton({
            icon_name: 'open-menu-symbolic',
            primary: true,
            tooltip_text: _('Main Menu'),
            menu_model: menu,
        });
        header.pack_end(menuButton);

        const toolbar = new Adw.ToolbarView();
        toolbar.add_top_bar(header);

        this._splitView = new Adw.NavigationSplitView({
            vexpand: true,
            hexpand: true,
        });
        this._splitView.min_sidebar_width = 220;
        this._splitView.max_sidebar_width = 400;
        this._splitView.sidebar_width_fraction = 0.28;

        this._sidebar_scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            min_content_width: 220,
        });

        this._sidebarPage = new Adw.NavigationPage({
            title: _('Curriculum'),
            child: this._sidebar_scrolled,
        });
        this._splitView.sidebar = this._sidebarPage;
        toolbar.set_content(this._splitView);

        this._toast_overlay = new Adw.ToastOverlay({
            vexpand: true,
            hexpand: true,
        });
        this._toast_overlay.set_child(toolbar);
        this.set_content(this._toast_overlay);

        try {
            const builder = Gtk.Builder.new_from_resource('/ir/urumlug/gnomeTutor/gtk/help-overlay.ui');
            const helpOverlay = builder.get_object('help_overlay');
            if (helpOverlay)
                this.set_help_overlay(helpOverlay);
        } catch (error) {
            console.debug(`Help overlay not loaded: ${error.message}`);
        }
    }

    _registerActions() {
        const resetModule = new Gio.SimpleAction({ name: 'reset-module' });
        resetModule.connect('activate', () => this._resetModuleProgress());
        this.add_action(resetModule);

        const resetAll = new Gio.SimpleAction({ name: 'reset-all-progress' });
        resetAll.connect('activate', () => this._confirmResetAllProgress());
        this.add_action(resetAll);

        const installSpotlight = new Gio.SimpleAction({ name: 'install-spotlight' });
        installSpotlight.connect('activate', () => this._installSpotlightExtension());
        this.add_action(installSpotlight);
    }

    _installSpotlightExtension() {
        const dialog = Adw.AlertDialog.new(
            _('Install Spotlight extension?'),
            _('This copies the optional GNOME Shell extension into your user account and enables it. Restart GNOME Shell or log out and back in afterward.'),
        );
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('install', _('Install'));
        dialog.set_response_appearance('install', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('cancel');
        dialog.set_close_response('cancel');
        dialog.connect('response', (_dialog, response) => {
            if (response !== 'install')
                return;
            try {
                const result = ExtensionInstaller.install();
                const message = result.enabled
                    ? _('Spotlight extension installed and enabled. Restart GNOME Shell or log out and back in.')
                    : _('Spotlight extension installed to %s. Run “gnome-extensions enable %s”, then restart Shell.').format(
                        result.installDir,
                        ExtensionInstaller.uuid,
                    );
                this._toast_overlay.add_toast(Adw.Toast.new(message));
            } catch (error) {
                this._toast_overlay.add_toast(Adw.Toast.new(
                    _('Could not install Spotlight extension: %s').format(error.message),
                ));
            }
        });
        dialog.present(this);
    }

    _moduleForReset() {
        return this._activeModule
            ?? this._lastModule
            ?? this._sidebar?.selectedModule
            ?? null;
    }

    _resetModuleProgress() {
        const module = this._moduleForReset();
        if (!module) {
            this._toast_overlay.add_toast(Adw.Toast.new(
                _('Select a module in the sidebar to reset, or finish one first.'),
            ));
            return;
        }

        this._lessonEngine.endStep();
        this._instructionCard.dismiss();
        this._progressStore.clearModuleProgress(module);
        this._sidebar.setCurriculum(this._curriculum);
        this._openModule(module);

        this._toast_overlay.add_toast(Adw.Toast.new(
            _('Progress reset for “%s”.').format(module.title),
        ));
    }

    _confirmResetAllProgress() {
        const dialog = Adw.AlertDialog.new(
            _('Reset all progress?'),
            _('This clears completion and hint history for every module. You cannot undo this.'),
        );
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('reset', _('Reset Everything'));
        dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.set_default_response('cancel');
        dialog.set_close_response('cancel');
        dialog.connect('response', (_dialog, response) => {
            if (response !== 'reset')
                return;
            this._resetAllProgress();
        });
        dialog.present(this);
    }

    _resetAllProgress() {
        this._lessonEngine.endStep();
        this._instructionCard.dismiss();
        this._progressStore.clearAllProgress();
        this._activeModule = null;
        this._lastModule = null;
        this._activeStepIndex = 0;
        this._sidebar.setCurriculum(this._curriculum);
        this._header_title.subtitle = _('Learn Linux through real GUI and terminal tools');
        this._stepView.clear();
        this._toast_overlay.add_toast(Adw.Toast.new(_('All progress has been reset.')));
    }

    _loadCurriculum() {
        try {
            const root = ContentLoader.defaultContentRoot();
            console.log(`Loading curriculum from: ${root}`);
            const loader = new ContentLoader(root);
            this._curriculum = loader.load();
            console.log(`Loaded ${this._curriculum.modules.length} module(s)`);
            this._sidebar.setCurriculum(this._curriculum);
        } catch (error) {
            console.error(`Failed to load curriculum: ${error.message}`);
            this._showLoadError(error.message);
        }
    }

    _showLoadError(message) {
        this._contentPage.child = new Adw.StatusPage({
            icon_name: 'dialog-error-symbolic',
            title: _('Could not load curriculum'),
            description: message,
            vexpand: true,
        });
    }

    _stepProgressLabel() {
        if (!this._activeModule)
            return '';
        return _('Step %1$d of %2$d').format(
            this._activeStepIndex + 1,
            this._activeModule.steps.length,
        );
    }

    _openModule(module) {
        this._lessonEngine.endStep();
        this._activeModule = module;
        this._activeStepIndex = 0;
        this._header_title.subtitle = `${module.title} · ${this._stepProgressLabel()}`;
        this._sidebar.selectModule(module);
        this._renderActiveStep();
    }

    _openStep(module, step) {
        this._lessonEngine.endStep();
        this._activeModule = module;
        this._activeStepIndex = module.steps.findIndex(item => item.id === step.id);
        if (this._activeStepIndex < 0)
            this._activeStepIndex = 0;
        this._header_title.subtitle = `${module.title} · ${this._stepProgressLabel()}`;
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
        this._header_title.subtitle = `${this._activeModule.title} · ${this._stepProgressLabel()}`;
    }

    _recordHint() {
        if (!this._activeModule)
            return;
        const step = this._activeModule.steps[this._activeStepIndex];
        this._progressStore.recordHintReveal(this._lessonEngine.stepKey(this._activeModule, step));
    }

    _resetActiveStep() {
        if (!this._activeModule)
            return;
        const step = this._activeModule.steps[this._activeStepIndex];
        const path = this._lessonEngine.resetStep(this._activeModule, step);
        if (path)
            this._renderActiveStep();
    }

    _onStepValidated() {
        const toast = Adw.Toast.new(_('Nice! That command looks right.'));
        this._toast_overlay.add_toast(toast);
        this._advanceStep();
    }

    _advanceStep() {
        if (!this._activeModule)
            return;

        this._lessonEngine.endStep();
        this._instructionCard.dismiss();

        const step = this._activeModule.steps[this._activeStepIndex];
        const stepKey = this._lessonEngine.stepKey(this._activeModule, step);
        this._progressStore.markStepCompleted(stepKey);

        if (this._activeStepIndex + 1 >= this._activeModule.steps.length) {
            this._lastModule = this._activeModule;
            this._progressStore.markModuleCompleted(`${this._activeModule.track}/${this._activeModule.module}`);
            this._sidebar.setCurriculum(this._curriculum);
            this._header_title.subtitle = _('Module complete');
            this._activeModule = null;
            this._stepView.showModuleComplete(this._lastModule, this._progressStore, () => this._resetModuleProgress());
            return;
        }

        this._activeStepIndex++;
        this._sidebar.setCurriculum(this._curriculum);
        this._renderActiveStep();
    }
});
