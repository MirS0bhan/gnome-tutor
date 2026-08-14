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
        'module-selected': {},
        'step-selected': {},
    },
}, class CurriculumSidebar extends Gtk.Box {
    constructor(params = {}) {
        super({
            orientation: Gtk.Orientation.VERTICAL,
            ...params,
        });

        this._progressStore = null;
        this._curriculum = null;
        this._selectedModule = null;

        this.append(new Adw.WindowTitle({
            title: _('Curriculum'),
            subtitle: _('Tracks, modules, and steps'),
        }));

        this._scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hscrollbar_policy: Gtk.PolicyType.NEVER,
        });
        this._list = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['navigation-sidebar'],
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

    selectModule(module) {
        this._selectedModule = module;
        this._rebuild();
    }

    _moduleKey(module) {
        return `${module.track}/${module.module}`;
    }

    _stepKey(module, step) {
        return `${module.track}/${module.module}/${step.id}`;
    }

    _rebuild() {
        let child = this._list.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._list.remove(child);
            child = next;
        }

        if (!this._curriculum)
            return;

        for (const track of this._curriculum.tracks) {
            const trackRow = new Adw.ExpanderRow({
                title: track.title,
                subtitle: _('%d modules').format(track.modules.length),
            });
            trackRow.set_selectable(false);

            for (const module of track.modules) {
                const progress = this._progressStore?.moduleProgress(module) ?? { completed: 0, total: module.steps.length, done: false };
                const subtitle = progress.done
                    ? _('Complete')
                    : _('%d of %d steps').format(progress.completed, progress.total);

                const moduleRow = new Adw.ActionRow({
                    title: module.title,
                    subtitle,
                });
                moduleRow.set_activatable(true);

                if (progress.done) {
                    moduleRow.add_suffix(new Gtk.Image({
                        icon_name: 'object-select-symbolic',
                        css_classes: ['success'],
                    }));
                } else if (this._selectedModule === module) {
                    moduleRow.add_suffix(new Gtk.Image({
                        icon_name: 'view-reveal-symbolic',
                    }));
                }

                moduleRow.connect('activated', () => {
                    this._selectedModule = module;
                    this.emit('module-selected', module);
                    this._rebuild();
                });

                trackRow.add_row(moduleRow);

                if (this._selectedModule === module) {
                    trackRow.expanded = true;
                    for (const step of module.steps) {
                        const completed = this._progressStore?.isStepCompleted(this._stepKey(module, step)) ?? false;
                        const stepRow = new Adw.ActionRow({
                            title: step.id,
                            subtitle: step.kind,
                        });
                        stepRow.add_prefix(new Gtk.Image({
                            icon_name: completed ? 'object-select-symbolic' : 'radio-missing-symbolic',
                            css_classes: completed ? ['success'] : [],
                        }));
                        stepRow.set_activatable(true);
                        stepRow.connect('activated', () => {
                            this.emit('step-selected', module, step);
                        });
                        trackRow.add_row(stepRow);
                    }
                }
            }

            this._list.append(trackRow);
        }
    }
});
