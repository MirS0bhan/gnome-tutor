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

const FALLBACK_COMMANDS = {
    'org.gnome.Nautilus': ['nautilus'],
    'org.gnome.Settings': ['gnome-control-center'],
    'org.gnome.Software': ['gnome-software'],
    'org.gnome.SystemMonitor': ['gnome-system-monitor'],
    'org.gnome.TextEditor': ['gnome-text-editor', 'gedit'],
    'org.gnome.DiskUtility': ['gnome-disks'],
};

export class AppLauncher {
    static launch(step, sandboxPath) {
        const appId = step.target_app;
        if (appId === 'org.gnome.Nautilus')
            return AppLauncher._openNautilus(sandboxPath);

        const launchFile = AppLauncher._resolveLaunchFile(step, sandboxPath);
        const app = AppLauncher._lookupApp(appId);
        if (app)
            return AppLauncher._launchApp(app, launchFile);

        return AppLauncher._launchFallback(appId, launchFile);
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

    static _resolveLaunchFile(step, sandboxPath) {
        if (!sandboxPath || !step.validate?.exists)
            return null;
        return GLib.build_filenamev([sandboxPath, step.validate.exists]);
    }

    static _lookupApp(appId) {
        const candidates = APP_ALIASES[appId] ?? [appId];
        for (const id of candidates) {
            for (const desktopId of [id, `${id}.desktop`]) {
                try {
                    const app = Gio.DesktopAppInfo.new(desktopId);
                    if (app)
                        return app;
                } catch {
                    // try next candidate
                }
            }
        }

        for (const app of Gio.AppInfo.get_all()) {
            const id = app.get_id()?.replace(/\.desktop$/, '') ?? '';
            if (candidates.includes(id))
                return app;
        }

        return null;
    }

    static _launchApp(app, filePath) {
        if (filePath) {
            const file = Gio.File.new_for_path(filePath);
            if (!file.query_exists(null))
                throw new Error(`file not found: ${filePath}`);

            if (typeof app.launch_uris === 'function')
                return app.launch_uris([file.get_uri()], null) ?? true;

            return app.launch([file], null) ?? true;
        }

        return app.launch([], null) ?? true;
    }

    static _launchFallback(appId, filePath) {
        const commands = FALLBACK_COMMANDS[appId];
        if (!commands?.length)
            throw new Error(`application not found: ${appId}`);

        for (const command of commands) {
            const argv = filePath ? [command, filePath] : [command];
            try {
                Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
                return true;
            } catch {
                // try next command alias
            }
        }

        throw new Error(`application not found: ${appId}`);
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
            const launcher = AppLauncher._lookupApp('org.gnome.Nautilus');
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
