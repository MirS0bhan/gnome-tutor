/* main.js
 *
 * Copyright 2026 misano
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import { print } from 'system';

pkg.initGettext();
pkg.initFormat();

const { GnomeTutorWindow } = await import('./window.js');

export const GnomeTutorApplication = GObject.registerClass(
    class GnomeTutorApplication extends Adw.Application {
        constructor() {
            super({
                application_id: 'ir.urumlug.gnomeTutor',
                flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
                resource_base_path: '/ir/urumlug/gnomeTutor'
            });

            const quit_action = new Gio.SimpleAction({name: 'quit'});
                quit_action.connect('activate', action => {
                this.quit();
            });
            this.add_action(quit_action);
            this.set_accels_for_action('app.quit', ['<primary>q']);

            const show_about_action = new Gio.SimpleAction({name: 'about'});
            show_about_action.connect('activate', action => {
                const aboutParams = {
                    application_name: _('Linux Academy'),
                    application_icon: 'ir.urumlug.gnomeTutor',
                    developer_name: 'misano / UrumLUG',
                    version: '0.1.0',
                    developers: [
                        'misano',
                    ],
                    // Translators: Replace "translator-credits" with your name/username, and optionally an email or URL.
                    translator_credits: _('translator-credits'),
                    copyright: '© 2026 misano',
                    comments: _('Teach Linux through real GUI apps and a real terminal.'),
                };
                const aboutDialog = new Adw.AboutDialog(aboutParams);
                aboutDialog.present(this.active_window);
            });
            this.add_action(show_about_action);
        }

        vfunc_activate() {
            let {active_window} = this;

            if (!active_window)
                active_window = new GnomeTutorWindow(this);

            active_window.present();
        }
    }
);

export async function main(argv) {
    if (argv.includes('--install-extension')) {
        const { ExtensionInstaller } = await import('./engine/extensionInstaller.js');
        try {
            const result = ExtensionInstaller.install();
            print(`Spotlight extension installed to ${result.installDir}.`);
            if (result.enabled)
                print('Extension enabled. Restart GNOME Shell or log out and back in.');
            else
                print(`Run: gnome-extensions enable ${ExtensionInstaller.uuid}`);
            return 0;
        } catch (error) {
            console.error(`Failed to install Spotlight extension: ${error.message}`);
            return 1;
        }
    }

    const application = new GnomeTutorApplication();
    return application.runAsync(argv);
}
