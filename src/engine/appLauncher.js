/* appLauncher.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const FILE_MANAGER_DBUS = 'org.freedesktop.FileManager1';
const FILE_MANAGER_PATH = '/org/freedesktop/FileManager1';

const APP_ALIASES = {
    'org.gnome.Nautilus': ['org.gnome.Nautilus', 'nautilus'],
    'org.gnome.Settings': ['org.gnome.Settings', 'gnome-control-center'],
    'org.gnome.Software': ['org.gnome.Software'],
    'org.gnome.SystemMonitor': ['org.gnome.SystemMonitor', 'gnome-system-monitor'],
    'org.gnome.TextEditor': ['org.gnome.TextEditor', 'org.gnome.gedit'],
    'org.gnome.DiskUtility': ['org.gnome.DiskUtility', 'gnome-disks'],
};

export class AppLauncher {
    static launch(step, sandboxPath) {
        const appId = step.target_app;
        if (appId === 'org.gnome.Nautilus')
            return AppLauncher._openNautilus(sandboxPath);

        const ids = APP_ALIASES[appId] ?? [appId];
        for (const id of ids) {
            const app = Gio.AppInfo.create_from_appid(id);
            if (!app)
                continue;
            if (sandboxPath && appId === 'org.gnome.Nautilus')
                return app.launch([GLib.File.new_for_path(sandboxPath)], null);
            return app.launch([], null);
        }

        throw new Error(`application not found: ${appId}`);
    }

    static displayName(appId) {
        switch (appId) {
        case 'org.gnome.Nautilus':
            return _('Files');
        case 'org.gnome.Settings':
            return _('Settings');
        case 'org.gnome.Software':
            return _('Software');
        case 'org.gnome.SystemMonitor':
            return _('System Monitor');
        case 'org.gnome.TextEditor':
            return _('Text Editor');
        case 'org.gnome.DiskUtility':
            return _('Disks');
        default:
            return appId?.split('.').pop() ?? _('app');
        }
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
