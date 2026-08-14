/* preferencesWindow.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Adw from 'gi://Adw';
import GioUnix from 'gi://GioUnix';
import Gtk from 'gi://Gtk';

import { ExtensionInstaller } from '../engine/extensionInstaller.js';

let _window = null;

export function showPreferencesWindow(parent) {
    if (_window) {
        _window.present();
        return;
    }

    _window = new Adw.PreferencesWindow({
        title: _('Preferences'),
        transient_for: parent,
        modal: true,
        search_enabled: false,
    });
    _window.connect('close-request', () => {
        _window = null;
        return false;
    });

    const page = Adw.PreferencesPage.new();
    const group = Adw.PreferencesGroup.new({
        title: _('Spotlight extension'),
        description: _('Optional on-screen highlights during GUI lessons.'),
    });

    const installRow = Adw.ActionRow.new({
        title: _('Get the Spotlight extension'),
        subtitle: _('Install the companion Shell extension into your user account.'),
    });
    const installButton = new Gtk.Button({ label: _('Install extension'), valign: Gtk.Align.CENTER });
    installButton.connect('clicked', () => {
        try {
            ExtensionInstaller.install();
        } catch (error) {
            console.error(error.message);
        }
    });
    installRow.add_suffix(installButton);
    installRow.set_activatable_widget(installButton);
    group.add(installRow);

    const openRow = Adw.ActionRow.new({
        title: _('Open Extensions app'),
        subtitle: _('Manage installed GNOME Shell extensions.'),
    });
    const openButton = new Gtk.Button({ label: _('Open'), valign: Gtk.Align.CENTER });
    openButton.connect('clicked', () => {
        try {
            const app = GioUnix.DesktopAppInfo.new('org.gnome.Extensions.desktop')
                ?? GioUnix.DesktopAppInfo.new('gnome-extensions');
            app?.launch([], null);
        } catch (error) {
            console.error(error.message);
        }
    });
    openRow.add_suffix(openButton);
    openRow.set_activatable_widget(openButton);
    group.add(openRow);

    page.add(group);
    _window.add(page);
    _window.present();
}
