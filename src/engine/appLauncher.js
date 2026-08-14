/* appLauncher.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const FILE_MANAGER_DBUS = 'org.freedesktop.FileManager1';
const FILE_MANAGER_PATH = '/org/freedesktop/FileManager1';

export class AppLauncher {
    static launch(step, sandboxPath) {
        const appId = step.target_app;
        if (appId === 'org.gnome.Nautilus')
            return AppLauncher._openNautilus(sandboxPath);

        const app = Gio.AppInfo.create_from_appid(appId);
        if (!app)
            throw new Error(`application not found: ${appId}`);

        if (sandboxPath)
            return app.launch([GLib.File.new_for_path(sandboxPath)], null);

        return app.launch([], null);
    }

    static _openNautilus(path) {
        const uri = Gio.File.new_for_path(path).get_uri();

        try {
            const proxy = Gio.DBusProxy.new_sync(
                Gio.bus_get_sync(Gio.BusType.SESSION, null),
                Gio.DBusProxyFlags.NONE,
                null,
                FILE_MANAGER_DBUS,
                FILE_MANAGER_PATH,
                'org.freedesktop.FileManager1',
                null,
            );
            proxy.ShowFolders_sync([uri], '');
            return true;
        } catch {
            const launcher = Gio.AppInfo.create_from_appid('org.gnome.Nautilus');
            if (launcher)
                return launcher.launch([Gio.File.new_for_path(path)], null) ?? true;

            Gio.Subprocess.new(
                ['nautilus', path],
                Gio.SubprocessFlags.NONE,
            );
            return true;
        }
    }
}
