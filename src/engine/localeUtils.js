/* localeUtils.js — RTL locale detection for layout mirroring.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

const RTL_PREFIXES = ['fa', 'ar', 'he', 'ur', 'ps'];

export function isRtlLocale() {
    return GLib.get_language_names().some(lang =>
        RTL_PREFIXES.some(prefix => lang.startsWith(prefix)));
}

export function applyWindowLocaleDirection(window) {
    if (isRtlLocale())
        window.set_default_direction(Gtk.TextDirection.RTL);
}
