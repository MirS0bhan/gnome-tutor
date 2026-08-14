#!/usr/bin/env -S gjs -m
/* content-lint.js — validate content packs against the lesson schema.
 *
 * Usage: gjs -m tools/content-lint.js [content-root]
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import { exit, programArgs } from 'system';

import Gio from 'gi://Gio';

import { ContentLoader, ContentSchemaError } from '../src/engine/contentLoader.js';

const root = programArgs[1] ?? GLib.build_filenamev([GLib.get_current_dir(), 'content']);

function assertPathExists(baseDir, relativePath, context) {
    const fullPath = GLib.build_filenamev([baseDir, relativePath.replace(/\/$/, '')]);
    const file = Gio.File.new_for_path(fullPath);
    if (!file.query_exists(null))
        throw new ContentSchemaError(`missing path "${relativePath}" (${context})`, fullPath);
}

function validateFixtures(curriculum) {
    let fixtureCount = 0;
    let diagramCount = 0;

    for (const mod of curriculum.modules) {
        const packDir = mod.pack_dir;

        for (const step of mod.steps) {
            if (typeof step.fixture === 'string' && step.fixture.trim()) {
                assertPathExists(packDir, step.fixture, `${mod.track}/${mod.module}/${step.id}`);
                fixtureCount++;
            }

            if (step.kind === 'contrast' && typeof step.contrast_diagram === 'string') {
                assertPathExists(packDir, step.contrast_diagram, `${mod.track}/${mod.module}/${step.id}`);
                diagramCount++;
            }
        }
    }

    return { fixtureCount, diagramCount };
}

try {
    const loader = new ContentLoader(root);
    const curriculum = loader.load();
    const { fixtureCount, diagramCount } = validateFixtures(curriculum);
    print(`Validated ${curriculum.packs.length} pack(s), ${curriculum.modules.length} module(s), ${curriculum.tracks.length} track(s), ${fixtureCount} fixture(s), ${diagramCount} diagram(s).`);
} catch (error) {
    if (error instanceof ContentSchemaError)
        printerr(`Schema error: ${error.message}\n`);
    else
        printerr(`${error.message}\n`);
    exit(1);
}
