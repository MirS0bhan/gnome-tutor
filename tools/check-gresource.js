#!/usr/bin/env -S gjs -m
/* check-gresource.js — ensure every src JS file is listed in the gresource manifest.
 *
 * Usage: gjs -m tools/check-gresource.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { exit } from 'system';

const root = GLib.build_filenamev([GLib.get_current_dir(), 'src']);
const manifestPath = GLib.build_filenamev([root, 'ir.urumlug.gnomeTutor.src.gresource.xml']);

function listJsFiles(dir) {
    const results = [];
    const file = Gio.File.new_for_path(dir);
    const enumerator = file.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
    let info;
    while ((info = enumerator.next_file(null))) {
        const name = info.get_name();
        const path = GLib.build_filenamev([dir, name]);
        if (info.get_file_type() === Gio.FileType.DIRECTORY) {
            results.push(...listJsFiles(path));
            continue;
        }
        if (name.endsWith('.js'))
            results.push(path.slice(root.length + 1));
    }
    return results;
}

function readManifestFiles(path) {
    const [, bytes] = GLib.file_get_contents(path);
    const text = new TextDecoder().decode(bytes);
    const files = [];
    for (const match of text.matchAll(/<file>([^<]+)<\/file>/g))
        files.push(match[1]);
    return files;
}

const jsFiles = listJsFiles(root).sort();
const manifestFiles = readManifestFiles(manifestPath).sort();
const manifestSet = new Set(manifestFiles);

let missing = 0;
for (const file of jsFiles) {
    if (manifestSet.has(file))
        continue;
    printerr(`Missing from gresource: ${file}\n`);
    missing++;
}

let extra = 0;
const jsSet = new Set(jsFiles);
for (const file of manifestFiles) {
    if (jsSet.has(file))
        continue;
    printerr(`Gresource lists missing file: ${file}\n`);
    extra++;
}

if (missing || extra) {
    printerr(`${missing} missing, ${extra} stale gresource entries.\n`);
    exit(1);
}

print(`Gresource manifest covers all ${jsFiles.length} JS source file(s).`);
