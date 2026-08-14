/* contrastBeatView.js — two-column contrast layout with optional diagram (§5.6).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { HintPanel } from './hintPanel.js';

export const ContrastBeatView = GObject.registerClass({
    GTypeName: 'ContrastBeatView',
    Signals: {
        'hint-revealed': {},
    },
}, class ContrastBeatView extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            vexpand: true,
            ...params,
        });
    }

    setStep(module, step) {
        let child = this.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this.remove(child);
            child = next;
        }

        this.append(new Gtk.Label({
            label: step.title,
            css_classes: ['title-2'],
            halign: Gtk.Align.START,
            wrap: true,
        }));

        const columns = new Gtk.Box({
            spacing: 0,
            homogeneous: true,
            margin_top: 12,
        });

        columns.append(this._column(_('What you\'re used to'), 'computer-symbolic',
            step.body_left ?? '', ['dim-label']));
        columns.append(new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL }));
        columns.append(this._column(_('On Linux (GNOME)'), 'folder-symbolic',
            step.body_right ?? '', ['accent']));

        this.append(columns);

        if (step.contrast_diagram && module.pack_dir) {
            const diagramPath = Gio.File.new_for_path(module.pack_dir)
                .get_child(step.contrast_diagram)
                .get_path();
            if (Gio.File.new_for_path(diagramPath).query_exists(null)) {
                const picture = Gtk.Picture.new_for_filename(diagramPath);
                picture.set_can_shrink(true);
                picture.set_content_fit(Gtk.ContentFit.CONTAIN);
                picture.set_size_request(-1, 160);
                picture.halign = Gtk.Align.CENTER;
                picture.margin_top = 18;
                this.append(picture);
            }
        }

        if (step.body) {
            this.append(new Gtk.Label({
                label: step.body,
                wrap: true,
                halign: Gtk.Align.START,
                margin_top: 12,
            }));
        }

        const hints = step.hints ?? [];
        if (hints.length > 0) {
            const hintPanel = new HintPanel();
            hintPanel.setHints(hints);
            hintPanel.connect('hint-revealed', () => this.emit('hint-revealed'));
            this.append(hintPanel);
        }
    }

    _column(title, iconName, body, headerClasses = []) {
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            css_classes: ['card'],
            vexpand: false,
            margin_end: 12,
            margin_start: 12,
        });
        const inner = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });
        const header = new Gtk.Box({ spacing: 8 });
        header.append(new Gtk.Image({ icon_name: iconName }));
        header.append(new Gtk.Label({ label: title, css_classes: ['heading', ...headerClasses] }));
        inner.append(header);
        inner.append(new Gtk.Label({
            label: body,
            wrap: true,
            halign: Gtk.Align.START,
        }));
        box.append(inner);
        return box;
    }
});
