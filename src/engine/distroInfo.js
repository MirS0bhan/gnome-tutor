/* distroInfo.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';

const ID_MAP = {
    debian: 'debian',
    ubuntu: 'debian',
    linuxmint: 'debian',
    pop: 'debian',
    fedora: 'fedora',
    rhel: 'fedora',
    centos: 'fedora',
    arch: 'arch',
    manjaro: 'arch',
    opensuse: 'fedora',
    suse: 'fedora',
};

let cached = null;

function parseOsRelease() {
    if (cached)
        return cached;

    const paths = ['/etc/os-release', '/usr/lib/os-release'];
    let text = '';
    for (const path of paths) {
        try {
            const [ok, bytes] = GLib.file_get_contents(path);
            if (ok) {
                text = new TextDecoder().decode(bytes);
                break;
            }
        } catch {
            // try next
        }
    }

    const idMatch = text.match(/^ID=(.+)$/m);
    const id = idMatch?.[1]?.replace(/"/g, '').toLowerCase() ?? 'unknown';
    cached = ID_MAP[id] ?? 'debian';
    return cached;
}

export function currentDistroVariantKey() {
    return parseOsRelease();
}

export function applyDistroVariants(step) {
    if (!step.distro_variants)
        return step;

    const key = currentDistroVariantKey();
    const variant = step.distro_variants[key] ?? step.distro_variants.default;
    if (!variant)
        return step;

    const merged = { ...step };
    if (variant.instruction)
        merged.instruction = variant.instruction;
    if (variant.body)
        merged.body = variant.body;
    if (variant.validate)
        merged.validate = { ...merged.validate, ...variant.validate };
    if (variant.hints)
        merged.hints = variant.hints;
    delete merged.distro_variants;
    return merged;
}
