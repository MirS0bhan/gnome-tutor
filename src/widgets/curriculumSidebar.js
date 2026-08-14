/* curriculumSidebar.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const CurriculumSidebar = GObject.registerClass({
    GTypeName: 'CurriculumSidebar',
    Signals: {
        'track-selected': {},
        'module-selected': {},
        'step-selected': {},
    },
}, class CurriculumSidebar extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            vexpand: true,
            hexpand: true,
            ...params,
        });

        this._progressStore = null;
        this._curriculum = null;
        this._selectedTrack = null;
        this._selectedModule = null;
        this._selectedStep = null;
        this._trackRows = new Map();

        this._scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
        });

        this._list = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.SINGLE,
            css_classes: ['navigation-sidebar'],
        });
        this._list.connect('row-selected', (_box, row) => {
            if (!row?.track)
                return;
            this._selectedTrack = row.track;
            this._selectedModule = null;
            this._selectedStep = null;
            this.emit('track-selected');
        });

        this._scrolled.set_child(this._list);
        this.append(this._scrolled);
    }

    setProgressStore(store) {
        this._progressStore = store;
        this._rebuild();
    }

    setCurriculum(curriculum) {
        this._curriculum = curriculum;
        this._rebuild();
    }

    selectTrack(track) {
        this._selectedTrack = track;
        this._selectedModule = null;
        this._selectedStep = null;
        this._rebuild();
        this._highlightTrack(track);
    }

    selectModule(module) {
        this._selectedTrack = this._curriculum?.tracks?.find(t => t.id === module.track) ?? null;
        this._selectedModule = module;
        this._selectedStep = null;
        this._rebuild();
    }

    scrollToTrack(track) {
        const row = this._trackRows.get(track.id);
        if (row)
            this._list.select_row(row);
    }

    get selectedTrack() {
        return this._selectedTrack;
    }

    get selectedModule() {
        return this._selectedModule;
    }

    get selectedStep() {
        return this._selectedStep;
    }

    _stepKey(module, step) {
        return `${module.track}/${module.module}/${step.id}`;
    }

    _trackLabel(track) {
        const order = track.order ?? 0;
        return _('%d. %s').format(order, track.title);
    }

    _highlightTrack(track) {
        const row = this._trackRows.get(track?.id);
        if (row)
            this._list.select_row(row);
    }

    _moduleSubtitle(module) {
        const progress = this._progressStore.moduleProgress(module);
        if (progress.done)
            return _('Review');
        if (progress.started)
            return _('Continue');
        return _('%d steps').format(progress.total);
    }

    _rebuild() {
        let child = this._list.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._list.remove(child);
            child = next;
        }
        this._trackRows.clear();

        if (!this._curriculum)
            return;

        for (const track of this._curriculum.tracks) {
            const progress = this._progressStore?.trackProgress(track)
                ?? { fraction: 0, done: false };

            const rowBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                margin_top: 8,
                margin_bottom: 8,
                margin_start: 12,
                margin_end: 12,
            });

            const indicatorLabel = progress.done
                ? '✓'
                : `${Math.round(progress.fraction * 100)}%`;
            const indicator = new Gtk.Label({
                label: indicatorLabel,
                width_chars: 3,
                xalign: 0.5,
                css_classes: progress.done ? ['success'] : ['dim-label', 'caption'],
            });
            rowBox.append(indicator);

            const textBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 2,
                hexpand: true,
            });

            const titleRow = new Gtk.Box({ spacing: 8 });
            titleRow.append(new Gtk.Label({
                label: this._trackLabel(track),
                xalign: 0,
                css_classes: ['heading'],
            }));
            if (track.id === 'orientation') {
                titleRow.append(new Gtk.Label({
                    label: _('Start here'),
                    css_classes: ['caption', 'accent'],
                }));
            }
            textBox.append(titleRow);

            if (track.description) {
                textBox.append(new Gtk.Label({
                    label: track.description,
                    xalign: 0,
                    wrap: true,
                    css_classes: ['dim-label', 'caption'],
                    max_width_chars: 28,
                }));
            }

            rowBox.append(textBox);

            const row = new Gtk.ListBoxRow({ child: rowBox });
            row.track = track;
            this._trackRows.set(track.id, row);
            this._list.append(row);

            if (this._selectedTrack?.id !== track.id)
                continue;

            for (const module of track.modules) {
                const moduleWrap = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 4,
                    margin_start: 36,
                    margin_end: 8,
                    margin_bottom: 8,
                });

                const moduleButton = new Gtk.Button({
                    label: module.title,
                    css_classes: ['flat'],
                    halign: Gtk.Align.START,
                });
                moduleButton.connect('clicked', () => {
                    this._selectedModule = module;
                    this._selectedStep = null;
                    this.emit('module-selected');
                });
                moduleWrap.append(moduleButton);
                moduleWrap.append(new Gtk.Label({
                    label: this._moduleSubtitle(module),
                    xalign: 0,
                    css_classes: ['dim-label', 'caption'],
                }));

                for (const step of module.steps) {
                    const completed = this._progressStore?.isStepCompleted(this._stepKey(module, step)) ?? false;
                    const stepButton = new Gtk.Button({
                        label: step.title ?? step.id,
                        css_classes: ['flat'],
                        halign: Gtk.Align.START,
                    });
                    if (completed)
                        stepButton.add_css_class('success');
                    stepButton.connect('clicked', () => {
                        this._selectedModule = module;
                        this._selectedStep = step;
                        this.emit('step-selected');
                    });
                    moduleWrap.append(stepButton);
                }

                const moduleRow = new Gtk.ListBoxRow({ child: moduleWrap });
                moduleRow.set_selectable(false);
                this._list.append(moduleRow);
            }
        }

        this._highlightTrack(this._selectedTrack);
    }
});
