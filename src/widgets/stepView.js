/* stepView.js — placeholder beat renderers for Phase 0.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

function kindLabel(kind) {
    switch (kind) {
    case 'contrast':
        return _('Contrast');
    case 'gui':
        return _('GUI practice');
    case 'terminal':
        return _('Terminal practice');
    case 'bridge':
        return _('Bridge');
    default:
        return kind;
    }
}

export const StepView = GObject.registerClass({
    GTypeName: 'StepView',
    Signals: {
        'continue': {},
        'mark-done': {},
    },
}, class StepView extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            ...params,
        });

        this._stack = new Gtk.Stack({ vexpand: true, hexpand: true });
        this._emptyPage = this._buildEmptyPage();
        this._contentPage = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
        });
        this._contentBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
        });
        this._contentPage.set_child(this._contentBox);

        this._stack.add_named(this._emptyPage, 'empty');
        this._stack.add_named(this._contentPage, 'content');
        this._stack.visible_child_name = 'empty';
        this.append(this._stack);

        this._footer = new Gtk.Box({
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 24,
            margin_end: 24,
            halign: Gtk.Align.END,
        });
        this._continueButton = new Gtk.Button({
            label: _('Continue'),
            css_classes: ['suggested-action'],
        });
        this._continueButton.connect('clicked', () => this.emit('continue'));
        this._footer.append(this._continueButton);
        this.append(this._footer);
    }

    _buildEmptyPage() {
        return new Adw.StatusPage({
            icon_name: 'system-run-symbolic',
            title: _('Choose a lesson'),
            description: _('Select a module from the curriculum sidebar to begin. Each module follows the four-beat pattern: contrast, GUI, terminal, and bridge.'),
        });
    }

    clear() {
        this._stack.visible_child_name = 'empty';
        this._footer.visible = false;
        let child = this._contentBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._contentBox.remove(child);
            child = next;
        }
    }

    showStep(module, step, { stepIndex, stepTotal }) {
        let child = this._contentBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._contentBox.remove(child);
            child = next;
        }

        this._stack.visible_child_name = 'content';
        this._footer.visible = true;
        this._continueButton.label = stepIndex + 1 >= stepTotal ? _('Finish module') : _('Continue');

        this._contentBox.append(new Gtk.Label({
            label: module.title,
            css_classes: ['title-4'],
            halign: Gtk.Align.START,
        }));

        this._contentBox.append(new Gtk.Label({
            label: _('%1$s · Step %2$d of %3$d').format(kindLabel(step.kind), stepIndex + 1, stepTotal),
            css_classes: ['dim-label'],
            halign: Gtk.Align.START,
        }));

        const card = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
            margin_top: 12,
        });
        const cardInner = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 18,
            margin_bottom: 18,
            margin_start: 18,
            margin_end: 18,
        });

        switch (step.kind) {
        case 'contrast':
            cardInner.append(new Gtk.Label({
                label: step.title,
                css_classes: ['title-2'],
                halign: Gtk.Align.START,
                wrap: true,
            }));
            cardInner.append(new Gtk.Label({
                label: step.body,
                wrap: true,
                halign: Gtk.Align.START,
                justify: Gtk.Justification.FILL,
            }));
            break;
        case 'gui':
            cardInner.append(new Gtk.Label({
                label: step.instruction,
                wrap: true,
                halign: Gtk.Align.START,
            }));
            cardInner.append(new Gtk.Label({
                label: _('Phase 2 will launch %s and show a floating instruction card.').format(step.target_app),
                css_classes: ['dim-label', 'body'],
                wrap: true,
                halign: Gtk.Align.START,
            }));
            break;
        case 'terminal':
            cardInner.append(new Gtk.Label({
                label: step.instruction,
                wrap: true,
                halign: Gtk.Align.START,
            }));
            cardInner.append(new Gtk.Label({
                label: _('Phase 1 will embed a real sandboxed terminal here.'),
                css_classes: ['dim-label', 'body'],
                wrap: true,
                halign: Gtk.Align.START,
            }));
            break;
        case 'bridge':
            cardInner.append(new Gtk.Label({
                label: step.body,
                wrap: true,
                halign: Gtk.Align.START,
                justify: Gtk.Justification.FILL,
            }));
            break;
        }

        card.append(cardInner);
        this._contentBox.append(card);
    }
});
