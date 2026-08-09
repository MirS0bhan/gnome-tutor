/* window.js
 *
 * Copyright 2026 misano
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

const TEMP_CAROUSEL_ITEMS = [
    {
        title: 'Welcome',
        subtitle: 'Swipe or use the arrows to explore',
        icon_name: 'emblem-favorite-symbolic',
    },
    {
        title: 'GTK 4',
        subtitle: 'Modern toolkit for GNOME apps',
        icon_name: 'applications-graphics-symbolic',
    },
    {
        title: 'Libadwaita',
        subtitle: 'Adaptive widgets and HIG patterns',
        icon_name: 'location-services-active-symbolic',
    },
    {
        title: 'GJS',
        subtitle: 'JavaScript bindings for GNOME',
        icon_name: 'emoji-people-symbolic',
    },
];

export const GnomeTutorWindow = GObject.registerClass({
    GTypeName: 'GnomeTutorWindow',
    Template: 'resource:///ir/urumlug/gnomeTutor/window.ui',
    InternalChildren: ['carousel', 'carousel_dots', 'prev_button', 'next_button'],
}, class GnomeTutorWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application });

        this._carousel_dots.set_carousel(this._carousel);
        this._populate_carousel();

        this._prev_button.connect('clicked', () => this._scroll_relative(-1));
        this._next_button.connect('clicked', () => this._scroll_relative(1));
        this._carousel.connect('notify::position', () => this._update_navigation());
        this._update_navigation();
    }

    _populate_carousel() {
        for (const item of TEMP_CAROUSEL_ITEMS) {
            const page = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                css_classes: ['card'],
                spacing: 12,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
                halign: Gtk.Align.FILL,
                valign: Gtk.Align.CENTER,
            });

            page.append(new Gtk.Image({
                icon_name: item.icon_name,
                pixel_size: 64,
                halign: Gtk.Align.CENTER,
            }));

            page.append(new Gtk.Label({
                label: item.title,
                css_classes: ['title-1'],
                halign: Gtk.Align.CENTER,
            }));

            page.append(new Gtk.Label({
                label: item.subtitle,
                css_classes: ['body'],
                wrap: true,
                justify: Gtk.Justification.CENTER,
                halign: Gtk.Align.CENTER,
            }));

            this._carousel.append(page);
        }
    }

    _current_page() {
        return Math.round(this._carousel.position);
    }

    _scroll_relative(delta) {
        const target = this._current_page() + delta;
        if (target < 0 || target >= this._carousel.n_pages)
            return;

        this._carousel.scroll_to(target, true);
    }

    _update_navigation() {
        const page = this._current_page();
        this._prev_button.sensitive = page > 0;
        this._next_button.sensitive = page < this._carousel.n_pages - 1;
    }
});
