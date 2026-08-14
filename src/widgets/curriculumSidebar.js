/* curriculumSidebar.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

function stepKindLabel(kind) {
    switch (kind) {
    case 'contrast':
        return _('Contrast');
    case 'gui':
        return _('Files');
    case 'terminal':
        return _('Terminal');
    case 'bridge':
        return _('Bridge');
    case 'practice':
        return _('Practice');
    case 'challenge':
        return _('Challenge');
    default:
        return kind;
    }
}

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
            spacing: 12,
            vexpand: true,
            hexpand: true,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
            ...params,
        });

        this._progressStore = null;
        this._curriculum = null;
        this._selectedModule = null;
        this._selectedStep = null;

        this.append(new Adw.WindowTitle({
            title: _('Curriculum'),
            subtitle: _('Tracks, modules, and steps'),
        }));

        this._groupsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 18,
        });
        this.append(this._groupsBox);
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
        this._selectedStep = null;
        this._rebuild();
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

    _rebuild() {
        let child = this._groupsBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            this._groupsBox.remove(child);
            child = next;
        }

        if (!this._curriculum)
            return;

        for (const track of this._curriculum.tracks) {
            const group = new Adw.PreferencesGroup({
                title: track.title,
                description: _('%d modules').format(track.modules.length),
            });

            for (const module of track.modules) {
                const progress = this._progressStore?.moduleProgress(module)
                    ?? { completed: 0, total: module.steps.length, done: false };
                const subtitle = progress.done
                    ? _('Complete')
                    : _('%d of %d steps').format(progress.completed, progress.total);

                const moduleRow = new Adw.ExpanderRow({
                    title: module.title,
                    subtitle,
                });
                moduleRow.expanded = this._selectedModule === module;

                if (progress.done) {
                    moduleRow.add_suffix(new Gtk.Image({
                        icon_name: 'object-select-symbolic',
                        css_classes: ['success'],
                    }));
                }

                moduleRow.connect('notify::expanded', () => {
                    if (!moduleRow.expanded || this._selectedModule === module)
                        return;
                    this._selectedModule = module;
                    this._selectedStep = null;
                    this.emit('module-selected');
                });

                for (const step of module.steps) {
                    const completed = this._progressStore?.isStepCompleted(this._stepKey(module, step)) ?? false;
                    const stepRow = new Adw.ActionRow({
                        title: step.title ?? step.id.replace(/-/g, ' '),
                        subtitle: stepKindLabel(step.kind),
                    });
                    stepRow.add_prefix(new Gtk.Image({
                        icon_name: completed ? 'object-select-symbolic' : 'radio-missing-symbolic',
                        css_classes: completed ? ['success'] : ['dim-label'],
                    }));
                    stepRow.set_activatable(true);
                    stepRow.connect('activated', () => {
                        this._selectedModule = module;
                        this._selectedStep = step;
                        this.emit('step-selected');
                    });
                    moduleRow.add_row(stepRow);
                }

                group.add(moduleRow);
            }

            this._groupsBox.append(group);
        }
    }
});
