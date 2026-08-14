/* vteTheme.js — sync VTE colors with the active GTK/Adwaita theme.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

function rgbaFromColor(color) {
    const rgba = new Gdk.RGBA();
    rgba.red = color.red;
    rgba.green = color.green;
    rgba.blue = color.blue;
    rgba.alpha = color.alpha;
    return rgba;
}

export function applyAdwaitaTheme(terminal, widgetForContext) {
    const context = widgetForContext.get_style_context();
    const fg = rgbaFromColor(context.get_color(Gtk.StateFlags.FLAGS_NONE));
    const bg = rgbaFromColor(context.get_background_color(Gtk.StateFlags.FLAGS_NONE));

    terminal.set_colors(fg, bg, []);
    terminal.set_color_foreground(fg);
    terminal.set_color_background(bg);
    terminal.set_default_colors(fg, bg, []);
}
