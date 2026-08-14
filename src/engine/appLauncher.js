/* appLauncher.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GioUnix from 'gi://GioUnix';

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
    'org.gnome.Nautilus': ['nautilus', 'org.gnome.Nautilus'],
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
        if (AppLauncher._inFlatpak())
            return AppLauncher._launchFallback(appId, launchFile);

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

    static _inFlatpak() {
        return GLib.file_test('/.flatpak-info', GLib.FileTest.EXISTS);
    }

    static _lookupApp(appId) {
        const candidates = APP_ALIASES[appId] ?? [appId];
        for (const id of candidates) {
            for (const desktopId of [id, `${id}.desktop`]) {
                try {
                    const app = GioUnix.DesktopAppInfo.new(desktopId);
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

    static _spawn(argv) {
        Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
        return true;
    }

    static _spawnHost(argv) {
        if (!AppLauncher._inFlatpak())
            return AppLauncher._spawn(argv);

        if (!GLib.find_program_in_path('flatpak-spawn'))
            throw new Error(`host command unavailable in Flatpak: ${argv[0]}`);

        return AppLauncher._spawn(['flatpak-spawn', '--host', ...argv]);
    }

    static _openUri(uri) {
        try {
            Gio.AppInfo.launch_default_for_uri(uri, null);
            return true;
        } catch {
            // portal unavailable or rejected
        }

        if (GLib.find_program_in_path('gio'))
            return AppLauncher._spawn(['gio', 'open', uri]);

        if (GLib.find_program_in_path('xdg-open'))
            return AppLauncher._spawn(['xdg-open', uri]);

        return false;
    }

    static _launchFallback(appId, filePath) {
        const commands = FALLBACK_COMMANDS[appId];
        if (!commands?.length)
            throw new Error(`application not found: ${appId}`);

        if (filePath) {
            const uri = Gio.File.new_for_path(filePath).get_uri();
            if (AppLauncher._openUri(uri))
                return true;
        }

        for (const command of commands) {
            const argv = filePath ? [command, filePath] : [command];
            try {
                if (AppLauncher._inFlatpak())
                    return AppLauncher._spawnHost(argv);
                return AppLauncher._spawn(argv);
            } catch {
                // try next command alias
            }
        }

        throw new Error(`application not found: ${appId}`);
    }

    static _openNautilus(path) {
        const file = Gio.File.new_for_path(path);
        const uri = file.get_uri();

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
            // fall through to desktop / host launchers
        }

        if (AppLauncher._openUri(uri))
            return true;

        if (!AppLauncher._inFlatpak()) {
            try {
                const launcher = AppLauncher._lookupApp('org.gnome.Nautilus');
                if (launcher)
                    return launcher.launch([file], null) ?? true;
            } catch {
                // fall through
            }
        }

        return AppLauncher._launchFallback('org.gnome.Nautilus', path);
    }
}
