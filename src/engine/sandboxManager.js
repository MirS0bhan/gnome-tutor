/* sandboxManager.js
 *
 * Provisions per-step sandbox directories from content-pack fixtures.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const APP_ID = 'ir.urumlug.gnomeTutor';

function removeRecursive(file) {
    if (!file.query_exists(null))
        return;

    const type = file.query_file_type(Gio.FileQueryInfoFlags.NONE, null);
    if (type === Gio.FileType.DIRECTORY) {
        const enumerator = file.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = enumerator.next_file(null)))
            removeRecursive(file.get_child(info.get_name()));
    }
    file.delete(null);
}

function copyRecursive(source, destination) {
    const type = source.query_file_type(Gio.FileQueryInfoFlags.NONE, null);
    if (type === Gio.FileType.DIRECTORY) {
        destination.make_directory_with_parents(null);
        const enumerator = source.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = enumerator.next_file(null))) {
            const name = info.get_name();
            if (name === '.gitkeep')
                continue;
            copyRecursive(source.get_child(name), destination.get_child(name));
        }
        return;
    }
    destination.get_parent().make_directory_with_parents(null);
    source.copy(destination, Gio.FileCopyFlags.OVERWRITE, null, null);
}

export class SandboxManager {
    constructor() {
        this._baseDir = this._resolveBaseDir();
    }

    _resolveBaseDir() {
        const flatpakVar = GLib.build_filenamev([
            GLib.get_home_dir(), '.var', 'app', APP_ID, 'cache', 'lessons',
        ]);
        if (Gio.File.new_for_path(flatpakVar).query_exists(null))
            return flatpakVar;

        return GLib.build_filenamev([
            GLib.get_user_cache_dir(), 'gnome-tutor', 'lessons',
        ]);
    }

    stepKey(module, step) {
        return `${module.pack_id}/${module.track}/${module.module}/${step.id}`;
    }

    sandboxPath(module, step) {
        return GLib.build_filenamev([this._baseDir, this.stepKey(module, step)]);
    }

    practicePath(module) {
        return GLib.build_filenamev([this._baseDir, 'practice', module.track, module.module]);
    }

    provisionPractice(module, fixtureRelative) {
        const dest = Gio.File.new_for_path(this.practicePath(module));
        if (dest.query_exists(null))
            return dest.get_path();

        if (fixtureRelative) {
            const fixturePath = this.resolveFixturePath(module, fixtureRelative);
            const fixture = Gio.File.new_for_path(fixturePath);
            if (fixture.query_exists(null))
                copyRecursive(fixture, dest);
            else
                dest.make_directory_with_parents(null);
        } else {
            dest.make_directory_with_parents(null);
        }
        return dest.get_path();
    }

    resetPractice(module, fixtureRelative) {
        const dest = Gio.File.new_for_path(this.practicePath(module));
        removeRecursive(dest);
        if (fixtureRelative) {
            const fixturePath = this.resolveFixturePath(module, fixtureRelative);
            const fixture = Gio.File.new_for_path(fixturePath);
            if (fixture.query_exists(null))
                copyRecursive(fixture, dest);
            else
                dest.make_directory_with_parents(null);
        } else {
            dest.make_directory_with_parents(null);
        }
        return dest.get_path();
    }

    resolveFixturePath(module, fixtureRelative) {
        const packRoot = module.pack_dir ?? GLib.build_filenamev([
            SandboxManager.contentRoot(),
            module.pack_id,
        ]);
        return GLib.build_filenamev([
            packRoot,
            'fixtures',
            fixtureRelative.replace(/^fixtures\//, '').replace(/\/$/, ''),
        ]);
    }

    provision(module, step) {
        if (!step.fixture)
            return this.sandboxPath(module, step);

        const sandbox = Gio.File.new_for_path(this.sandboxPath(module, step));
        removeRecursive(sandbox);

        const fixturePath = this.resolveFixturePath(module, step.fixture);
        const fixture = Gio.File.new_for_path(fixturePath);
        if (!fixture.query_exists(null))
            throw new Error(`fixture not found: ${fixturePath}`);

        copyRecursive(fixture, sandbox);
        this._ensureBashrc(sandbox, module);
        return sandbox.get_path();
    }

    _ensureBashrc(sandboxDir, module) {
        const bashrc = sandboxDir.get_child('.bashrc');
        if (bashrc.query_exists(null))
            return;

        const templatePath = GLib.build_filenamev([
            module.pack_dir ?? GLib.build_filenamev([SandboxManager.contentRoot(), module.pack_id]),
            'fixtures',
            '.bashrc',
        ]);
        const template = Gio.File.new_for_path(templatePath);
        if (template.query_exists(null))
            template.copy(bashrc, Gio.FileCopyFlags.OVERWRITE, null, null);
    }

    reset(module, step) {
        return this.provision(module, step);
    }
}

SandboxManager.contentRoot = function contentRoot() {
    const fromEnv = GLib.getenv('GNOME_TUTOR_CONTENT_DIR');
    if (fromEnv)
        return fromEnv;

    if (typeof pkg !== 'undefined' && pkg.datadir) {
        const installed = GLib.build_filenamev([pkg.datadir, 'gnome-tutor', 'content']);
        if (Gio.File.new_for_path(installed).query_exists(null))
            return installed;
    }

    const candidates = [
        GLib.build_filenamev([GLib.get_current_dir(), 'content']),
        GLib.build_filenamev([GLib.get_current_dir(), '..', 'content']),
        GLib.build_filenamev([GLib.get_current_dir(), '..', '..', 'content']),
    ];
    for (const path of candidates) {
        if (Gio.File.new_for_path(path).query_exists(null))
            return path;
    }

    throw new Error('content root not found');
};
