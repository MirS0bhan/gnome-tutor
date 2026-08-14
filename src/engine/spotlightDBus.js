/* spotlightDBus.js — shared Spotlight D-Bus contract constants and XML loader.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const SPOTLIGHT_BUS_NAME = 'systems.misano.LinuxAcademy.Spotlight';
export const SPOTLIGHT_OBJECT_PATH = '/systems/misano/LinuxAcademy/Spotlight';
export const SPOTLIGHT_IFACE_NAME = 'systems.misano.LinuxAcademy.Spotlight';

const XML_RESOURCE = '/ir/urumlug/gnomeTutor/dbus/systems.misano.LinuxAcademy.Spotlight.xml';

export function loadSpotlightInterfaceXml() {
    try {
        const bytes = Gio.resources_lookup_data(XML_RESOURCE, Gio.ResourceLookupFlags.NONE);
        return new TextDecoder().decode(bytes.toArray());
    } catch {
        // Fall through to filesystem paths (dev tree or extension install dir).
    }

    const relative = GLib.build_filenamev(['data', 'dbus', 'systems.misano.LinuxAcademy.Spotlight.xml']);
    const candidates = [
        GLib.build_filenamev([GLib.get_current_dir(), relative]),
        GLib.build_filenamev(['/usr/share/gnome-tutor/dbus', 'systems.misano.LinuxAcademy.Spotlight.xml']),
    ];
    for (const path of candidates) {
        const file = Gio.File.new_for_path(path);
        if (!file.query_exists(null))
            continue;
        return loadSpotlightInterfaceXmlFromFile(file);
    }

    throw new Error('Spotlight D-Bus interface XML not found');
}

export function loadSpotlightInterfaceXmlFromFile(file) {
    const [, contents] = file.load_contents(null);
    return new TextDecoder().decode(contents);
}
