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
import {
    breadcrumbLabel,
    firstIncompleteModule,
    firstIncompleteStepIndex,
    moduleOverviewButtonLabel,
    nextModuleInTrack,
    trackById,
    trackOverviewButtonLabel,
} from './engine/journeyHelpers.js';
import { LessonEngine } from './engine/lessonEngine.js';
import { ProgressStore } from './engine/progressStore.js';
import { CurriculumSidebar } from './widgets/curriculumSidebar.js';
import { InstructionCardWindow } from './widgets/instructionCardWindow.js';
import { JourneyStack } from './widgets/journeyStack.js';
import { StepView } from './widgets/stepView.js';
import { showPreferencesWindow } from './widgets/preferencesWindow.js';

export const GnomeTutorWindow = GObject.registerClass({
    GTypeName: 'GnomeTutorWindow',
}, class GnomeTutorWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({
            application,
            title: _('Linux Academy'),
            default_width: 900,
            default_height: 640,
        });

        this._progressStore = new ProgressStore();
        this._curriculum = null;
        this._activeTrack = null;
        this._activeModule = null;
        this._lastModule = null;
        this._activeStepIndex = 0;
        this._reviewMode = false;

        this._buildUi();
        this._registerActions();

        this._sidebar = new CurriculumSidebar({ vexpand: true, hexpand: true });
        this._stepView = new StepView({ vexpand: true, hexpand: true });
        this._journeyStack = new JourneyStack({ vexpand: true, hexpand: true });
        this._journeyStack.setProgressStore(this._progressStore);
        this._journeyStack.setLessonChild(this._stepView);

        this._lessonEngine = new LessonEngine({
            progressStore: this._progressStore,
            onGuiFixtureMatched: state => this._stepView.onGuiFixtureMatched(state),
            onTourOverviewOpened: () => this._stepView.onTourOverviewOpened(),
        });
        this._stepView.setEngine(this._lessonEngine);
        this._stepView.setCurriculumProvider(() => this._curriculum);

        this._instructionCard = new InstructionCardWindow({ application });
        this._instructionCard.set_transient_for(this);
        this._stepView.setInstructionCard(this._instructionCard);

        this._sidebar_scrolled.set_child(this._sidebar);
        this._contentHost.append(this._journeyStack);

        this._wireSignals();
        this._loadCurriculum();
        this._showInitialView();
    }

    _wireSignals() {
        this._sidebar.setProgressStore(this._progressStore);
        this._sidebar.connect('track-selected', () => this._onTrackSelected());
        this._sidebar.connect('module-selected', () => this._onModuleSelected());
        this._sidebar.connect('step-selected', () => this._onStepSelected());

        this._journeyStack.connect('welcome-started', () => this._onWelcomeStarted());
        this._journeyStack.connect('track-action', () => this._onTrackOverviewAction());
        this._journeyStack.connect('module-action', () => this._onModuleOverviewAction());

        this._stepView.connect('continue', () => this._advanceStep());
        this._stepView.connect('validated', () => this._onStepValidated());
        this._stepView.connect('hint-revealed', () => this._recordHint());
        this._stepView.connect('reset-step', () => this._resetActiveStep());
        this._stepView.connect('reset-practice', () => this._confirmResetPractice());
        this._stepView.connect('install-spotlight', () => this._installSpotlightExtension());
        this._stepView.connect('tour-continue', () => this._advanceStep());
        this._stepView.connect('tour-next-phase', () => this._onTourNextPhase());
    }

    _buildUi() {
        this._header_title = new Adw.WindowTitle({
            title: _('Linux Academy'),
            subtitle: _('Learn Linux through real GUI and terminal tools'),
        });

        const header = new Adw.HeaderBar();
        header.set_title_widget(this._header_title);

        this._sidebarToggle = new Gtk.ToggleButton({
            icon_name: 'sidebar-show-symbolic',
            visible: false,
        });
        this._sidebarToggle.connect('toggled', () => {
            this._splitView.collapsed = !this._sidebarToggle.active;
        });
        header.pack_start(this._sidebarToggle);

        const menu = Gio.Menu.new();
        const section = Gio.Menu.new();
        section.append(_('Preferences'), 'win.preferences');
        section.append(_('Reset Module Progress'), 'win.reset-module');
        section.append(_('Reset All Progress'), 'win.reset-all-progress');
        section.append(_('About Linux Academy'), 'app.about');
        section.append(_('Keyboard Shortcuts'), 'win.show-help-overlay');
        section.append(_('Quit'), 'app.quit');
        menu.append_section(null, section);

        header.pack_end(new Gtk.MenuButton({
            icon_name: 'open-menu-symbolic',
            primary: true,
            tooltip_text: _('Main Menu'),
            menu_model: menu,
        }));

        const toolbar = new Adw.ToolbarView();
        toolbar.add_top_bar(header);

        this._rootStack = new Gtk.Stack({ vexpand: true, hexpand: true });

        this._welcomeHost = new Gtk.Box({ vexpand: true, hexpand: true });
        this._mainHost = new Gtk.Box({ vexpand: true, hexpand: true, orientation: Gtk.Orientation.VERTICAL });

        this._splitView = new Adw.NavigationSplitView({
            vexpand: true,
            hexpand: true,
            min_sidebar_width: 280,
            max_sidebar_width: 400,
            sidebar_width_fraction: 0.31,
        });

        this._sidebar_scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            min_content_width: 280,
        });

        this._contentHost = new Gtk.Box({ vexpand: true, hexpand: true });
        this._splitView.sidebar = new Adw.NavigationPage({
            title: _('Curriculum'),
            child: this._sidebar_scrolled,
        });
        this._splitView.content = new Adw.NavigationPage({
            title: _('Lesson'),
            child: this._contentHost,
        });

        this._mainHost.append(this._splitView);
        this._rootStack.add_named(this._welcomeHost, 'welcome');
        this._rootStack.add_named(this._mainHost, 'main');
        toolbar.set_content(this._rootStack);

        this._toast_overlay = new Adw.ToastOverlay({ vexpand: true, hexpand: true });
        this._toast_overlay.set_child(toolbar);
        this.set_content(this._toast_overlay);

        const breakpoint = new Adw.Breakpoint({
            condition: 'max-width: 700sp',
        });
        breakpoint.add_setter(this._splitView, 'collapsed', true);
        breakpoint.add_setter(this._sidebarToggle, 'visible', true);
        this.add_breakpoint(breakpoint);

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

        const preferences = new Gio.SimpleAction({ name: 'preferences' });
        preferences.connect('activate', () => showPreferencesWindow(this));
        this.add_action(preferences);
    }

    _showInitialView() {
        if (!this._progressStore.isWelcomeSeen()) {
            this._rootStack.visible_child_name = 'welcome';
            this._mountWelcomeInHost();
            return;
        }
        this._showMainShell('home');
    }

    _mountWelcomeInHost() {
        let child = this._welcomeHost.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._welcomeHost.remove(child);
            child = next;
        }
        this._journeyStack.showWelcome();
        this._welcomeHost.append(this._journeyStack);
    }

    _showMainShell(page = 'home') {
        this._rootStack.visible_child_name = 'main';
        let child = this._contentHost.get_first_child();
        if (child !== this._journeyStack) {
            if (child)
                this._contentHost.remove(child);
            this._contentHost.append(this._journeyStack);
        }
        if (page === 'home')
            this._journeyStack.showHome();
    }

    _onWelcomeStarted() {
        this._progressStore.markWelcomeSeen();
        this._showMainShell('home');
    }

    _onTrackSelected() {
        const track = this._sidebar.selectedTrack;
        if (!track)
            return;

        if (track.id === 'practice') {
            const module = track.modules[0];
            if (module) {
                this._reviewMode = false;
                this._beginLesson(module, 0, { skipOverview: true });
            }
            return;
        }

        this._activeTrack = track;
        this._reviewMode = trackOverviewButtonLabel(track, this._progressStore) === _('Review');
        this._journeyStack.showTrackOverview(track);
        this._header_title.subtitle = track.title;
    }

    _onModuleSelected() {
        const module = this._sidebar.selectedModule;
        if (!module)
            return;
        if (module.track === 'practice') {
            this._reviewMode = false;
            this._beginLesson(module, 0, { skipOverview: true });
            return;
        }
        this._activeTrack = trackById(this._curriculum, module.track);
        this._reviewMode = moduleOverviewButtonLabel(module, this._progressStore) === _('Review');
        this._journeyStack.showModuleOverview(module);
        this._header_title.subtitle = module.title;
    }

    _onStepSelected() {
        const module = this._sidebar.selectedModule;
        const step = this._sidebar.selectedStep;
        if (!module || !step)
            return;
        this._reviewMode = false;
        const stepIndex = module.steps.findIndex(item => item.id === step.id);
        this._beginLesson(module, stepIndex >= 0 ? stepIndex : 0, { skipOverview: true });
    }

    _onTrackOverviewAction() {
        const track = this._journeyStack.activeTrack ?? this._activeTrack;
        if (!track)
            return;

        const label = trackOverviewButtonLabel(track, this._progressStore);
        this._reviewMode = label === _('Review');
        const module = this._reviewMode
            ? track.modules[0]
            : firstIncompleteModule(track, this._progressStore);
        if (!module)
            return;
        this._journeyStack.showModuleOverview(module);
    }

    _onModuleOverviewAction() {
        const module = this._journeyStack.activeModule ?? this._activeModule;
        if (!module)
            return;

        const label = moduleOverviewButtonLabel(module, this._progressStore);
        this._reviewMode = label === _('Review');
        const stepIndex = this._reviewMode
            ? 0
            : firstIncompleteStepIndex(module, this._progressStore);
        this._beginLesson(module, stepIndex);
    }

    _beginLesson(module, stepIndex, { skipOverview = false } = {}) {
        this._lessonEngine.endStep();
        this._activeTrack = trackById(this._curriculum, module.track);
        this._activeModule = module;
        this._activeStepIndex = stepIndex;
        this._sidebar.selectTrack(this._activeTrack);
        this._sidebar.selectModule(module);
        this._journeyStack.showLesson();
        this._updateHeaderForStep();
        this._renderActiveStep();
    }

    _updateHeaderForStep() {
        if (!this._activeModule)
            return;
        const step = this._activeModule.steps[this._activeStepIndex];
        this._header_title.subtitle = breadcrumbLabel(
            this._activeModule,
            this._activeStepIndex,
            this._activeModule.steps.length,
        );
        this._stepView.setBreadcrumb?.(this._header_title.subtitle, step);
    }

    _renderActiveStep() {
        if (!this._activeModule)
            return;
        const step = this._activeModule.steps[this._activeStepIndex];
        this._stepView.showStep(this._activeModule, step, {
            stepIndex: this._activeStepIndex,
            stepTotal: this._activeModule.steps.length,
            breadcrumb: breadcrumbLabel(
                this._activeModule,
                this._activeStepIndex,
                this._activeModule.steps.length,
            ),
            reviewMode: this._reviewMode,
        });
        this._updateHeaderForStep();
    }

    _onTourNextPhase() {
        const state = this._lessonEngine.advanceGuiPhase();
        this._stepView.syncTourPhase(state);
    }

    _installSpotlightExtension() {
        const dialog = Adw.AlertDialog.new(
            _('Install Spotlight extension?'),
            _('This copies the optional GNOME Shell extension into your user account and enables it. Restart GNOME Shell or log out and back in afterward.'),
        );
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('install', _('Install'));
        dialog.set_response_appearance('install', Adw.ResponseAppearance.SUGGESTED);
        dialog.connect('response', (_d, response) => {
            if (response !== 'install')
                return;
            try {
                const result = ExtensionInstaller.install();
                this._toast_overlay.add_toast(Adw.Toast.new(
                    result.enabled
                        ? _('Spotlight extension installed and enabled. Restart GNOME Shell.')
                        : _('Spotlight extension installed. Enable it from Preferences.'),
                ));
            } catch (error) {
                this._toast_overlay.add_toast(Adw.Toast.new(error.message));
            }
        });
        dialog.present(this);
    }

    _moduleForReset() {
        return this._activeModule ?? this._lastModule ?? this._sidebar?.selectedModule ?? null;
    }

    _resetModuleProgress() {
        const module = this._moduleForReset();
        if (!module) {
            this._toast_overlay.add_toast(Adw.Toast.new(_('Select a module in the sidebar to reset.')));
            return;
        }
        this._lessonEngine.endStep();
        this._instructionCard.dismiss();
        this._progressStore.clearModuleProgress(module);
        this._sidebar.setCurriculum(this._curriculum);
        this._onModuleSelected();
        this._toast_overlay.add_toast(Adw.Toast.new(_('Progress reset for “%s”.').format(module.title)));
    }

    _confirmResetAllProgress() {
        const dialog = Adw.AlertDialog.new(
            _('Reset all progress?'),
            _('This clears completion and hint history for every module.'),
        );
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('reset', _('Reset Everything'));
        dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.connect('response', (_d, response) => {
            if (response === 'reset')
                this._resetAllProgress();
        });
        dialog.present(this);
    }

    _resetAllProgress() {
        this._lessonEngine.endStep();
        this._instructionCard.dismiss();
        this._progressStore.clearAllProgress();
        this._activeModule = null;
        this._activeTrack = null;
        this._lastModule = null;
        this._activeStepIndex = 0;
        this._sidebar.setCurriculum(this._curriculum);
        this._showMainShell('home');
        this._header_title.subtitle = _('Learn Linux through real GUI and terminal tools');
        this._stepView.clear();
    }

    _confirmResetPractice() {
        const dialog = Adw.AlertDialog.new(
            _('Start fresh?'),
            _('This will erase everything in your practice folder.'),
        );
        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('erase', _('Erase'));
        dialog.set_response_appearance('erase', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.connect('response', (_d, response) => {
            if (response !== 'erase' || !this._activeModule)
                return;
            const step = this._activeModule.steps[this._activeStepIndex];
            this._lessonEngine.resetPractice(this._activeModule, step);
            this._renderActiveStep();
        });
        dialog.present(this);
    }

    _loadCurriculum() {
        try {
            const root = ContentLoader.defaultContentRoot();
            this._curriculum = new ContentLoader(root).load();
            this._sidebar.setCurriculum(this._curriculum);
            this._stepView.setCurriculum(this._curriculum);
        } catch (error) {
            console.error(`Failed to load curriculum: ${error.message}`);
        }
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
        if (step.kind === 'practice') {
            this._confirmResetPractice();
            return;
        }
        if (this._lessonEngine.resetStep(this._activeModule, step))
            this._renderActiveStep();
    }

    _onStepValidated() {
        this._toast_overlay.add_toast(Adw.Toast.new(_('That\'s it.')));
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
        this._progressStore.saveLastLocation({
            track: this._activeModule.track,
            module: this._activeModule.module,
            stepIndex: this._activeStepIndex,
        });

        if (step.kind === 'gui') {
            this._toast_overlay.add_toast(Adw.Toast.new(_('Nice.')));
        }

        if (this._activeStepIndex + 1 >= this._activeModule.steps.length) {
            this._finishModule();
            return;
        }

        this._activeStepIndex++;
        this._sidebar.setCurriculum(this._curriculum);
        this._renderActiveStep();
    }

    _finishModule() {
        this._lastModule = this._activeModule;
        this._progressStore.markModuleCompleted(`${this._activeModule.track}/${this._activeModule.module}`);
        this._sidebar.setCurriculum(this._curriculum);

        const finishedModule = this._activeModule;
        const track = this._activeTrack ?? trackById(this._curriculum, finishedModule.track);
        const nextModule = track ? nextModuleInTrack(track, finishedModule) : null;
        const trackDone = track && this._progressStore.trackProgress(track).done;

        this._activeModule = null;
        this._activeStepIndex = 0;

        if (trackDone) {
            const nextTrack = this._curriculum.tracks[
                this._curriculum.tracks.findIndex(t => t.id === track.id) + 1
            ];
            if (nextTrack) {
                this._activeTrack = nextTrack;
                this._sidebar.scrollToTrack(nextTrack);
                this._journeyStack.showTrackOverview(nextTrack);
                this._header_title.subtitle = nextTrack.title;
                return;
            }
        }

        if (nextModule) {
            this._journeyStack.showModuleOverview(nextModule);
            this._header_title.subtitle = nextModule.title;
            return;
        }

        this._showMainShell('home');
        this._header_title.subtitle = _('Module complete');
    }
});
