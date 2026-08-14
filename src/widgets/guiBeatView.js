/* guiBeatView.js — main-pane placeholder during GUI beats (§5.1).
 *
 * Adw.StatusPage is final — use composition, not subclassing.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const GuiBeatView = GObject.registerClass({
    GTypeName: 'GuiBeatView',
}, class GuiBeatView extends Gtk.Box {
    constructor(params = {}) {
        super({
            vexpand: true,
            hexpand: true,
            ...params,
        });

        this._statusPage = new Adw.StatusPage({
            icon_name: 'folder-symbolic',
            title: _('Practice in the real Files app'),
            description: _('Use the floating instruction card to open Files and follow each step.'),
            vexpand: true,
        });
        this.append(this._statusPage);
    }

    reset(_module, _step, { spotlightAvailable }) {
        this._statusPage.description = spotlightAvailable
            ? _('Use the floating instruction card beside Files. Spotlight highlights the Files window for each step.')
            : _('Use the floating instruction card beside Files. Install the spotlight extension for on-screen highlighting — text instructions still work without it.');
    }
});
