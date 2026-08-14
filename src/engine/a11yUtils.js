/* a11yUtils.js — GTK4 accessible property helpers for GJS.
 *
 * GJS bindings require array arguments to update_property(), not variadic C-style calls.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gtk from 'gi://Gtk';

export function setAccessibleLabel(widget, label) {
    if (!label)
        return;
    widget.update_property([Gtk.AccessibleProperty.LABEL], [label]);
}

export function setAccessibleDescription(widget, description) {
    if (!description)
        return;
    widget.update_property([Gtk.AccessibleProperty.DESCRIPTION], [description]);
}
