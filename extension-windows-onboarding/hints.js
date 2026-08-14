/* hints.js
 *
 * Contrast-map copy only. No Shell / Mutter imports.
 * Pass gettext as `_` from the extension so xgettext and runtime agree:
 * msgid is the English source string.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function getHints(_) {
    return [
        {
            id: 'start-miss',
            trigger: 'start-miss',
            defaultEnabled: true,
            windows: _('Start menu'),
            gnome: _('Activities / Super'),
            body: _('Looking for the Start menu? It moved to the top-left corner — or press Super (the Windows key).'),
            anchor: 'activities',
        },
        {
            id: 'overview-first',
            trigger: 'overview-first',
            defaultEnabled: true,
            windows: _('Start menu and taskbar'),
            gnome: _('Activities Overview and Dash'),
            body: _('This is your old Start menu and taskbar in one place. Type to launch apps; the icon row is your taskbar (only while Activities is open).'),
            anchor: 'dash',
            dismissOnOverviewHidden: true,
        },
        {
            id: 'taskbar-dash',
            trigger: 'overview-first',
            defaultEnabled: false,
            windows: _('Taskbar'),
            gnome: _('Dash'),
            body: _('Your taskbar is this row of icons. It only appears in Activities — pin apps by right-clicking them here.'),
            anchor: 'dash',
            dismissOnOverviewHidden: true,
        },
        {
            id: 'tray-miss',
            trigger: 'tray-miss',
            defaultEnabled: true,
            windows: _('System tray'),
            gnome: _('Quick Settings'),
            body: _('Wi-Fi, volume, and the clock moved to the top-right. Click there for what Windows called the system tray.'),
            anchor: 'quick-settings',
        },
        {
            id: 'quick-settings',
            trigger: 'quick-settings',
            defaultEnabled: true,
            windows: _('System tray and Control Panel'),
            gnome: _('Quick Settings and Settings'),
            body: _('This menu replaces the system tray. The gear opens Settings (Windows Settings / Control Panel).'),
            anchor: 'quick-settings',
        },
        {
            id: 'alttab-grouped',
            trigger: 'alttab-grouped',
            defaultEnabled: false,
            prefKey: 'hint-alttab',
            windows: _('Alt+Tab'),
            gnome: _('Application switcher'),
            body: _('Same shortcut as Windows. Apps are grouped here; Super+Tab shows every window.'),
            anchor: 'panel',
        },
        {
            id: 'window-controls',
            trigger: 'window-controls',
            defaultEnabled: false,
            prefKey: 'hint-window-controls',
            windows: _('Minimize, Maximize, Close'),
            gnome: _('Close (Minimize hidden)'),
            body: _('Close is here. Minimize is hidden by default — use Activities to get a window out of the way, or turn Minimize on in Settings → Windows.'),
            anchor: 'focus-window-controls',
        },
        {
            id: 'workspace-changed',
            trigger: 'workspace-changed',
            defaultEnabled: true,
            windows: _('Virtual desktops'),
            gnome: _('Workspaces'),
            body: _('Your windows aren’t gone — you switched workspaces (virtual desktops). Super+Page Up goes back.'),
            anchor: 'panel',
        },
        {
            id: 'explorer-shortcut',
            trigger: 'explorer-shortcut',
            defaultEnabled: true,
            windows: _('File Explorer'),
            gnome: _('Files'),
            body: _('That’s the Windows File Explorer shortcut. Here the app is Files — opening it for you. Next time: Super, then type Files.'),
            anchor: 'activities',
        },
        {
            id: 'desktop-context',
            trigger: 'desktop-context',
            defaultEnabled: true,
            windows: _('Desktop icons / Personalize'),
            gnome: _('Empty desktop and Files'),
            body: _('The desktop isn’t a folder of icons here. Your files live in Files (Super, then type Files).'),
            anchor: 'desktop',
        },
        {
            id: 'settings-shortcut',
            trigger: 'settings-shortcut',
            defaultEnabled: true,
            windows: _('Windows Settings'),
            gnome: _('Settings'),
            body: _('That’s the Windows Settings shortcut. GNOME Settings is opening — you can also click the gear in the top-right menu.'),
            anchor: 'quick-settings',
        },
    ];
}

export function getHint(hints, id) {
    return hints.find(hint => hint.id === id) ?? null;
}
