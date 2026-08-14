/* journeyStack.js — content-pane pages for the curriculum journey.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {
    moduleOverviewButtonLabel,
    trackOverviewButtonLabel,
} from '../engine/journeyHelpers.js';

export const JourneyStack = GObject.registerClass({
    GTypeName: 'JourneyStack',
    Signals: {
        'welcome-started': {},
        'track-action': {},
        'module-action': {},
    },
}, class JourneyStack extends Gtk.Stack {
    constructor(params = {}) {
        super({
            vexpand: true,
            hexpand: true,
            transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
            transition_duration: 200,
            ...params,
        });

        this._progressStore = null;
        this._activeTrack = null;
        this._activeModule = null;

        this._welcomePage = this._buildWelcomePage();
        this._homePage = this._buildHomePage();
        this._trackOverviewPage = this._buildOverviewPage('track');
        this._moduleOverviewPage = this._buildOverviewPage('module');

        this.add_named(this._welcomePage, 'welcome');
        this.add_named(this._homePage, 'home');
        this.add_named(this._trackOverviewPage.box, 'track-overview');
        this.add_named(this._moduleOverviewPage.box, 'module-overview');

        this.connect('notify::visible-child-name', () => {
            if (this.visible_child_name !== 'welcome')
                return;
            this._welcomePage.get_last_child()?.grab_focus();
        });
    }

    setLessonChild(child) {
        if (this._lessonChild)
            this.remove(this._lessonChild);
        this._lessonChild = child;
        this.add_named(child, 'lesson');
    }

    setProgressStore(store) {
        this._progressStore = store;
    }

    showWelcome() {
        this.visible_child_name = 'welcome';
    }

    showHome() {
        this.visible_child_name = 'home';
    }

    showTrackOverview(track) {
        this._activeTrack = track;
        const progress = this._progressStore?.trackProgress(track)
            ?? { done: false, started: false };
        this._trackOverviewPage.title.label = track.title;
        this._trackOverviewPage.description.label = track.description
            ?? _('Pick a module to begin this track.');
        this._trackOverviewPage.action.label = trackOverviewButtonLabel(track, this._progressStore);
        this._trackOverviewPage.action.visible = true;
        this._trackOverviewPage.action.update_property(
            Gtk.AccessibleProperty.DESCRIPTION,
            _('Start or continue the selected track'),
        );
        this.visible_child_name = 'track-overview';
    }

    showModuleOverview(module) {
        this._activeModule = module;
        this._moduleOverviewPage.title.label = module.title;
        this._moduleOverviewPage.description.label = module.module_description
            ?? _('Work through each step in order — GUI, terminal, and bridge.');
        this._moduleOverviewPage.action.label = moduleOverviewButtonLabel(module, this._progressStore);
        this._moduleOverviewPage.action.visible = true;
        this._moduleOverviewPage.action.update_property(
            Gtk.AccessibleProperty.DESCRIPTION,
            _('Start or continue the selected module'),
        );
        this.visible_child_name = 'module-overview';
    }

    showLesson() {
        this.visible_child_name = 'lesson';
    }

    get activeTrack() {
        return this._activeTrack;
    }

    get activeModule() {
        return this._activeModule;
    }

    _buildWelcomePage() {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            hexpand: true,
        });

        const page = new Adw.StatusPage({
            icon_name: 'help-book-symbolic',
            title: _('Welcome to Linux Academy'),
            description: _('Learn Linux the way you\'ll actually use it — in the real apps, and in the real terminal.'),
            vexpand: true,
        });
        box.append(page);

        const button = new Gtk.Button({
            label: _('Get started'),
            css_classes: ['pill', 'suggested-action'],
            halign: Gtk.Align.CENTER,
            margin_bottom: 48,
            can_focus: true,
        });
        button.connect('clicked', () => this.emit('welcome-started'));
        box.append(button);
        return box;
    }

    _buildHomePage() {
        return new Adw.StatusPage({
            icon_name: 'view-grid-symbolic',
            title: _('Pick a track'),
            description: _('Pick a track from the left to begin.'),
            vexpand: true,
        });
    }

    _buildOverviewPage(kind) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            hexpand: true,
            spacing: 24,
            margin_top: 48,
            margin_bottom: 48,
            margin_start: 48,
            margin_end: 48,
            valign: Gtk.Align.CENTER,
        });

        const title = new Gtk.Label({
            css_classes: ['title-1'],
            wrap: true,
            justify: Gtk.Justification.CENTER,
        });
        const description = new Gtk.Label({
            wrap: true,
            justify: Gtk.Justification.CENTER,
            css_classes: ['dim-label'],
            max_width_chars: 52,
        });
        const action = new Gtk.Button({
            css_classes: ['pill', 'suggested-action'],
            halign: Gtk.Align.CENTER,
            width_request: 200,
            can_focus: true,
        });
        action.connect('clicked', () => {
            if (kind === 'track')
                this.emit('track-action');
            else
                this.emit('module-action');
        });

        box.append(title);
        box.append(description);
        box.append(action);

        return { box, title, description, action };
    }
});
