/* contentLoader.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { ContentSchemaError, validateModule, validatePackManifest } from './schema.js';
import { applyDistroVariants } from './distroInfo.js';
import { parseYaml } from './yaml.js';

export { ContentSchemaError };

const MODULE_SUFFIXES = ['.yaml', '.yml', '.json'];

function readTextFile(file) {
    const [ok, contents] = file.load_contents(null);
    if (!ok)
        throw new Error(`could not read ${file.get_path()}`);
    const decoder = new TextDecoder();
    return decoder.decode(contents);
}

function parseModuleText(text, path) {
    try {
        if (path.endsWith('.json'))
            return JSON.parse(text);
        return parseYaml(text);
    } catch (error) {
        throw new ContentSchemaError(`parse error: ${error.message}`, path);
    }
}

function listDirectory(path) {
    const directory = Gio.File.new_for_path(path);
    if (!directory.query_exists(null))
        return [];

    const enumerator = directory.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    const entries = [];
    let info;
    while ((info = enumerator.next_file(null)))
        entries.push(info.get_name());
    return entries.sort();
}

function moduleSort(a, b) {
    if (a.order !== b.order)
        return a.order - b.order;
    return a.title.localeCompare(b.title);
}

export class ContentLoader {
    constructor(contentRoot) {
        this._contentRoot = contentRoot;
        this.packs = [];
        this.tracks = new Map();
        this.modules = [];
        this._trackMetadata = new Map();
    }

    load({ packId = null } = {}) {
        this.packs = [];
        this.tracks = new Map();
        this.modules = [];
        this._trackMetadata = new Map();

        for (const packName of listDirectory(this._contentRoot)) {
            if (packName.startsWith('.'))
                continue;
            const packDir = GLib.build_filenamev([this._contentRoot, packName]);
            const packFile = Gio.File.new_for_path(packDir);
            if (packFile.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.DIRECTORY)
                continue;
            if (packId && packName !== packId && packId !== 'all')
                continue;
            this._loadPack(packDir, packName);
        }

        this.modules.sort((a, b) => {
            if (a.track !== b.track)
                return a.track.localeCompare(b.track);
            return moduleSort(a, b);
        });

        const tracks = [...this.tracks.values()].sort((a, b) => {
            const ao = a.order ?? 999;
            const bo = b.order ?? 999;
            if (ao !== bo)
                return ao - bo;
            return a.id.localeCompare(b.id);
        });
        for (const track of tracks)
            track.modules.sort(moduleSort);

        return {
            packs: this.packs,
            tracks,
            modules: this.modules,
        };
    }

    _loadTrackMetadata(packDir) {
        const tracksPath = GLib.build_filenamev([packDir, 'tracks.yaml']);
        const file = Gio.File.new_for_path(tracksPath);
        if (!file.query_exists(null))
            return new Map();

        const doc = parseModuleText(readTextFile(file), tracksPath);
        for (const entry of doc.tracks ?? []) {
            if (entry?.id)
                this._trackMetadata.set(entry.id, entry);
        }
        return this._trackMetadata;
    }

    _enrichTrack(trackId, trackTitle) {
        const meta = this._trackMetadata?.get(trackId);
        return {
            id: trackId,
            title: meta?.title ?? trackTitle,
            description: meta?.description ?? '',
            order: meta?.order ?? 999,
            modules: [],
        };
    }

    _loadPack(packDir, packName) {
        const manifestPath = GLib.build_filenamev([packDir, 'pack.yaml']);
        const manifestJsonPath = GLib.build_filenamev([packDir, 'pack.json']);
        let manifestFile = Gio.File.new_for_path(manifestPath);
        if (!manifestFile.query_exists(null))
            manifestFile = Gio.File.new_for_path(manifestJsonPath);
        if (!manifestFile.query_exists(null))
            throw new ContentSchemaError(`pack "${packName}" is missing pack.yaml`);

        const manifest = validatePackManifest(
            parseModuleText(readTextFile(manifestFile), manifestFile.get_path()),
            manifestFile.get_path(),
        );

        const pack = { ...manifest, modules: [], pack_dir: packDir };
        this.packs.push(pack);

        const trackMeta = this._loadTrackMetadata(packDir);

        for (const entry of listDirectory(packDir)) {
            if (entry === 'pack.yaml' || entry === 'pack.json' || entry === 'tracks.yaml' || entry.startsWith('.'))
                continue;
            const entryPath = GLib.build_filenamev([packDir, entry]);
            const entryFile = Gio.File.new_for_path(entryPath);
            const entryType = entryFile.query_file_type(Gio.FileQueryInfoFlags.NONE, null);
            if (entryType === Gio.FileType.DIRECTORY) {
                this._loadModuleDirectory(pack, entryPath);
            } else if (MODULE_SUFFIXES.some(suffix => entry.endsWith(suffix))) {
                this._loadModuleFile(pack, entryPath);
            }
        }
    }

    _loadModuleDirectory(pack, directoryPath) {
        for (const entry of listDirectory(directoryPath)) {
            if (MODULE_SUFFIXES.some(suffix => entry.endsWith(suffix)))
                this._loadModuleFile(pack, GLib.build_filenamev([directoryPath, entry]));
        }
    }

    _loadModuleFile(pack, path) {
        const raw = parseModuleText(readTextFile(Gio.File.new_for_path(path)), path);
        const module = validateModule(raw, path);
        const steps = module.steps.map(step => applyDistroVariants(step));
        const enriched = {
            ...module,
            steps,
            pack_id: pack.id,
            pack_dir: pack.pack_dir,
            pack_language: pack.language,
            step_ids: steps.map(step => `${module.track}/${module.module}/${step.id}`),
        };
        pack.modules.push(enriched);
        this.modules.push(enriched);

        if (!this.tracks.has(module.track)) {
            this.tracks.set(module.track, this._enrichTrack(module.track, module.track_title));
        }
        this.tracks.get(module.track).modules.push(enriched);
    }

    static defaultContentRoot() {
        const fromEnv = GLib.getenv('GNOME_TUTOR_CONTENT_DIR');
        if (fromEnv)
            return fromEnv;

        const candidates = [];

        if (GLib.getenv('FLATPAK_ID'))
            candidates.push('/app/share/gnome-tutor/content');

        if (pkg?.datadir) {
            candidates.push(GLib.build_filenamev([pkg.datadir, 'gnome-tutor', 'content']));
        }

        candidates.push(
            GLib.build_filenamev([GLib.get_current_dir(), 'content']),
            GLib.build_filenamev([GLib.get_current_dir(), '..', 'content']),
            GLib.build_filenamev([GLib.get_current_dir(), '..', '..', 'content']),
        );

        for (const path of candidates) {
            if (Gio.File.new_for_path(path).query_exists(null))
                return path;
        }

        return candidates[0] ?? '/app/share/gnome-tutor/content';
    }
}
