/* spotlightAnchors.js — named spotlight regions (resolution-fragile, use sparingly).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const ANCHORS = {
    'nautilus-sidebar': { x: 0, y: 80, w: 220, h: 400 },
    'nautilus-toolbar': { x: 220, y: 80, w: 600, h: 48 },
};

export function resolveSpotlightAnchor(entry) {
    if (!entry)
        return null;
    if (entry.anchor) {
        const region = ANCHORS[entry.anchor];
        if (!region)
            return null;
        return { ...region, label: entry.label ?? '' };
    }
    if (entry.x !== undefined)
        return entry;
    return null;
}

export function resolveSpotlightList(spotlight) {
    if (!spotlight?.length)
        return null;
    return resolveSpotlightAnchor(spotlight[0]);
}
