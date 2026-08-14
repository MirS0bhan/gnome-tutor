/* extensionInstaller.js — install the optional Spotlight Shell extension.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const EXTENSION_UUID = 'linux-academy-spotlight@urumlug.ir';
const EXTENSION_FILES = ['metadata.json', 'extension.js'];

export class ExtensionInstaller {
    static get uuid() {
        return EXTENSION_UUID;
    }

    static installDir() {
        return GLib.build_filenamev([
            GLib.get_home_dir(),
            '.local/share/gnome-shell/extensions',
            EXTENSION_UUID,
        ]);
    }

    static sourceDir() {
        if (typeof pkg !== 'undefined' && pkg.datadir) {
            const installed = GLib.build_filenamev([pkg.datadir, 'gnome-tutor', 'extension']);
            if (Gio.File.new_for_path(installed).query_exists(null))
                return installed;
        }

        const candidates = [
            GLib.build_filenamev([GLib.get_current_dir(), 'extension']),
            GLib.build_filenamev([GLib.get_current_dir(), '..', 'extension']),
            GLib.build_filenamev([GLib.get_current_dir(), '..', '..', 'extension']),
        ];
        for (const path of candidates) {
            if (Gio.File.new_for_path(path).query_exists(null))
                return path;
        }

        throw new Error('Spotlight extension source files not found');
    }

    static isInstalled() {
        const dir = Gio.File.new_for_path(this.installDir());
        return dir.get_child('metadata.json').query_exists(null)
            && dir.get_child('extension.js').query_exists(null);
    }

    static install() {
        const sourceDir = this.sourceDir();
        const dest = Gio.File.new_for_path(this.installDir());
        dest.make_directory_with_parents(null);

        for (const name of EXTENSION_FILES) {
            const source = Gio.File.new_for_path(GLib.build_filenamev([sourceDir, name]));
            if (!source.query_exists(null))
                throw new Error(`missing extension file: ${name}`);

            source.copy(
                dest.get_child(name),
                Gio.FileCopyFlags.OVERWRITE,
                null,
                null,
            );
        }

        const dbusPaths = [
            GLib.build_filenamev([sourceDir, 'dbus']),
            GLib.build_filenamev([sourceDir, '..', 'data', 'dbus']),
        ];
        for (const dbusPath of dbusPaths) {
            const dbusSource = Gio.File.new_for_path(dbusPath);
            if (!dbusSource.query_exists(null))
                continue;
            const dbusDest = dest.get_child('dbus');
            dbusDest.make_directory_with_parents(null);
            const enumerator = dbusSource.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null))) {
                const fileName = info.get_name();
                dbusSource.get_child(fileName).copy(
                    dbusDest.get_child(fileName),
                    Gio.FileCopyFlags.OVERWRITE,
                    null,
                    null,
                );
            }
            break;
        }

        let enabled = false;
        try {
            const proc = Gio.Subprocess.new(
                ['gnome-extensions', 'enable', EXTENSION_UUID],
                Gio.SubprocessFlags.NONE,
            );
            proc.wait_check(null);
            enabled = true;
        } catch (error) {
            console.debug(`Could not enable extension automatically: ${error.message}`);
        }

        return {
            installDir: dest.get_path(),
            enabled,
        };
    }
}
