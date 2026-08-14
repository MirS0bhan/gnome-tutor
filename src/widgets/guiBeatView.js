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
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            hexpand: true,
            spacing: 12,
            ...params,
        });

        this._phaseLabel = new Gtk.Label({
            css_classes: ['dim-label', 'caption'],
            halign: Gtk.Align.CENTER,
            visible: false,
        });
        this.append(this._phaseLabel);

        this._statusPage = new Adw.StatusPage({
            icon_name: 'folder-symbolic',
            title: _('Practice in the real Files app'),
            description: _('Use the floating instruction card to open Files and follow each step.'),
            vexpand: true,
        });
        this.append(this._statusPage);
    }

    reset(_module, _step, { spotlightAvailable, tour = false }) {
        this._phaseLabel.visible = false;
        if (tour) {
            this._statusPage.title = _('Follow the desktop tour');
            this._statusPage.description = spotlightAvailable
                ? _('Use the instruction card. Spotlight highlights each part of the GNOME desktop.')
                : _('Follow the floating instruction card — install the Spotlight extension for on-screen highlights.');
            return;
        }
        this._statusPage.title = _('Practice in the real Files app');
        this._statusPage.description = spotlightAvailable
            ? _('Files should open on the practice folder. The instruction card stays beside this window. Spotlight highlights each step when the extension is enabled.')
            : _('Files should open on the practice folder. Follow the floating instruction card — install the Spotlight extension for on-screen highlights.');
    }

    setPhaseProgress(phaseIndex, phaseTotal, phaseLabel) {
        if (phaseIndex < 0 || phaseTotal <= 1) {
            this._phaseLabel.visible = false;
            return;
        }

        this._phaseLabel.visible = true;
        this._phaseLabel.label = _('%1$d of %2$d — %3$s').format(
            phaseIndex + 1,
            phaseTotal,
            phaseLabel,
        );
    }
});
