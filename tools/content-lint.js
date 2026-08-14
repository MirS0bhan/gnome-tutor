#!/usr/bin/env -S gjs -m
/* content-lint.js — validate content packs against the lesson schema.
 *
 * Usage: gjs -m tools/content-lint.js [content-root]
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';
import { exit, programArgs } from 'system';

import { ContentLoader, ContentSchemaError } from '../src/engine/contentLoader.js';

const root = programArgs[1] ?? GLib.build_filenamev([GLib.get_current_dir(), 'content']);

try {
    const loader = new ContentLoader(root);
    const curriculum = loader.load();
    print(`Validated ${curriculum.packs.length} pack(s), ${curriculum.modules.length} module(s), ${curriculum.tracks.length} track(s).`);
} catch (error) {
    if (error instanceof ContentSchemaError)
        printerr(`Schema error: ${error.message}\n`);
    else
        printerr(`${error.message}\n`);
    exit(1);
}
