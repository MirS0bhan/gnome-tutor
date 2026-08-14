/* vteLoader.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const VTE_VERSIONS = ['3.91', '2.91'];

export async function loadVte() {
    for (const version of VTE_VERSIONS) {
        try {
            return await import(`gi://Vte?version=${version}`);
        } catch {
            // try next version
        }
    }
    return null;
}

export function isVteMissingError(error) {
    return error?.message?.includes('Vte') ||
        error?.message?.includes('Typelib');
}
