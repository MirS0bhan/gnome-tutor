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

const FOUR_BEAT_KINDS = new Set(['contrast', 'gui', 'terminal', 'bridge']);

const root = programArgs[1] ?? GLib.build_filenamev([GLib.get_current_dir(), 'content']);

try {
    const loader = new ContentLoader(root);
    const curriculum = loader.load();
    let warnings = 0;

    for (const module of curriculum.modules) {
        if (module.track === 'filesystem') {
            const kinds = new Set(module.steps.map(step => step.kind));
            for (const kind of FOUR_BEAT_KINDS) {
                if (kinds.has(kind))
                    continue;
                printerr(`Warning: ${module.source_path ?? module.module}: filesystem module missing "${kind}" step\n`);
                warnings++;
            }
        }

        for (const step of module.steps) {
            if (step.kind === 'gui' && step.fixture && !step.phases?.length) {
                printerr(`Warning: ${module.source_path ?? module.module}/${step.id}: GUI step with fixture should define phases\n`);
                warnings++;
            }
            if ((step.kind === 'terminal' || step.kind === 'challenge')
                && step.fixture && step.sandbox !== false && !step.validate?.pattern) {
                printerr(`Warning: ${module.source_path ?? module.module}/${step.id}: terminal step with fixture should define validate.pattern\n`);
                warnings++;
            }
        }
    }

    print(`Validated ${curriculum.packs.length} pack(s), ${curriculum.modules.length} module(s), ${curriculum.tracks.length} track(s).`);
    if (warnings > 0) {
        printerr(`${warnings} content warning(s).\n`);
        exit(1);
    }
} catch (error) {
    if (error instanceof ContentSchemaError)
        printerr(`Schema error: ${error.message}\n`);
    else
        printerr(`${error.message}\n`);
    exit(1);
}
