/* prefs.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class WindowsOnboardingPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('Windows to GNOME Coach'),
            icon_name: 'help-about-symbolic',
        });

        const group = new Adw.PreferencesGroup({
            title: _('Coach-marks'),
            description: _('Hints appear only when you hit a real Windows habit that does not work in GNOME. They never start a tour on login.'),
        });

        const enabled = new Adw.SwitchRow({
            title: _('Enable coach-marks'),
            subtitle: _('Master on/off. Off means no hints at all.'),
        });
        settings.bind('enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(enabled);

        const replay = new Adw.ActionRow({
            title: _('Replay all hints'),
            subtitle: _('Clear seen state so each hint can appear once more.'),
        });
        const replayButton = new Gtk.Button({
            label: _('Replay'),
            valign: Gtk.Align.CENTER,
        });
        replayButton.connect('clicked', () => {
            settings.set_strv('seen-hints', []);
        });
        replay.add_suffix(replayButton);
        replay.activatable_widget = replayButton;
        group.add(replay);

        page.add(group);

        const extra = new Adw.PreferencesGroup({
            title: _('Optional hints'),
            description: _('These nags for many switchers. Leave them off unless you want every contrast-map row.'),
        });

        const altTab = new Adw.SwitchRow({
            title: _('Alt+Tab grouping'),
            subtitle: _('After the window switcher closes. GNOME already uses Alt+Tab.'),
        });
        settings.bind('hint-alttab', altTab, 'active', Gio.SettingsBindFlags.DEFAULT);
        extra.add(altTab);

        const windowControls = new Adw.SwitchRow({
            title: _('Minimize / maximize'),
            subtitle: _('When you drag a titlebar. Minimize is hidden in GNOME by default.'),
        });
        settings.bind('hint-window-controls', windowControls, 'active', Gio.SettingsBindFlags.DEFAULT);
        extra.add(windowControls);

        page.add(extra);
        window.add(page);
    }
}
