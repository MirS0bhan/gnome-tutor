/* spotlightAnchors.js — named spotlight regions (resolution-fragile, use sparingly).
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const ANCHORS = {
    'nautilus-sidebar': { x: 0, y: 80, w: 220, h: 400 },
    'nautilus-toolbar': { x: 220, y: 80, w: 600, h: 48 },
    'activities-hotcorner': { x: 0, y: 0, w: 40, h: 40 },
    'activities-app-grid': { x: 0, y: 120, w: 120, h: 80 },
};

export function resolveSpotlightAnchor(entry) {
    if (!entry)
        return null;

    if (entry.mode === 'window' || entry.wm_class) {
        return {
            mode: 'window',
            wm_class: entry.wm_class ?? '',
            label: entry.label ?? '',
        };
    }

    if (entry.anchor) {
        const region = ANCHORS[entry.anchor];
        if (!region)
            return null;
        return { mode: 'region', ...region, label: entry.label ?? '' };
    }

    if (entry.x !== undefined) {
        return {
            mode: 'region',
            x: entry.x,
            y: entry.y,
            w: entry.w,
            h: entry.h,
            label: entry.label ?? '',
        };
    }

    return null;
}

export function spotlightForPhase(phase, step) {
    if (phase?.spotlight?.length)
        return phase.spotlight;
    if (step?.spotlight?.length)
        return step.spotlight;
    return [];
}

export function resolveSpotlightList(spotlight) {
    if (!spotlight?.length)
        return null;
    return resolveSpotlightAnchor(spotlight[0]);
}

export function applySpotlight(spotlightClient, entry, fallbackLabel = '') {
    const resolved = resolveSpotlightAnchor(entry);
    if (!resolved)
        return false;

    const label = resolved.label || fallbackLabel;
    if (resolved.mode === 'window') {
        return spotlightClient.highlightWindow(resolved.wm_class, label);
    }

    if (resolved.x !== undefined) {
        spotlightClient.highlight(resolved.x, resolved.y, resolved.w, resolved.h, label);
        return true;
    }

    return false;
}
