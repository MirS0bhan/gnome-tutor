/* schema.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const STEP_KINDS = new Set(['contrast', 'gui', 'terminal', 'bridge', 'practice', 'challenge']);

export class ContentSchemaError extends Error {
    constructor(message, path = '') {
        super(path ? `${path}: ${message}` : message);
        this.path = path;
    }
}

function requireString(obj, key, path) {
    const value = obj[key];
    if (typeof value !== 'string' || value.trim() === '')
        throw new ContentSchemaError(`missing or empty string field "${key}"`, path);
    return value;
}

function requireStringArray(obj, key, path, { min = 0 } = {}) {
    const value = obj[key];
    if (!Array.isArray(value))
        throw new ContentSchemaError(`"${key}" must be an array`, path);
    if (value.length < min)
        throw new ContentSchemaError(`"${key}" must have at least ${min} item(s)`, path);
    for (const [index, item] of value.entries()) {
        if (typeof item !== 'string' || item.trim() === '')
            throw new ContentSchemaError(`"${key}[${index}]" must be a non-empty string`, path);
    }
    return value;
}

function validateSpotlight(spotlight, path) {
    if (!Array.isArray(spotlight))
        throw new ContentSchemaError('spotlight must be an array', path);
    for (const [index, entry] of spotlight.entries()) {
        const entryPath = `${path}[${index}]`;
        if (!entry || typeof entry !== 'object')
            throw new ContentSchemaError('spotlight entry must be an object', entryPath);
        if (entry.anchor !== undefined) {
            if (typeof entry.anchor !== 'string' || !entry.anchor.trim())
                throw new ContentSchemaError('spotlight.anchor must be a non-empty string', entryPath);
        } else {
            for (const key of ['x', 'y', 'w', 'h']) {
                if (typeof entry[key] !== 'number')
                    throw new ContentSchemaError(`spotlight.${key} must be a number`, entryPath);
            }
        }
    }
}

function validateDistroVariants(variants, path) {
    if (!variants || typeof variants !== 'object')
        throw new ContentSchemaError('distro_variants must be an object', path);
    for (const [key, variant] of Object.entries(variants)) {
        if (!variant || typeof variant !== 'object')
            throw new ContentSchemaError(`distro_variants.${key} must be an object`, path);
    }
}

function validateStep(step, path) {
    if (!step || typeof step !== 'object')
        throw new ContentSchemaError('step must be an object', path);

    const id = requireString(step, 'id', path);
    const kind = requireString(step, 'kind', path);
    if (!STEP_KINDS.has(kind))
        throw new ContentSchemaError(`unknown step kind "${kind}"`, path);

    switch (kind) {
    case 'contrast':
        requireString(step, 'title', `${path}/${id}`);
        requireString(step, 'body', `${path}/${id}`);
        if (step.contrast_diagram !== undefined && typeof step.contrast_diagram !== 'string')
            throw new ContentSchemaError('contrast_diagram must be a string', `${path}/${id}`);
        if (step.hints !== undefined)
            requireStringArray(step, 'hints', `${path}/${id}`);
        break;
    case 'gui':
        requireString(step, 'instruction', `${path}/${id}`);
        requireString(step, 'target_app', `${path}/${id}`);
        if (step.fixture !== undefined && typeof step.fixture !== 'string')
            throw new ContentSchemaError('fixture must be a string', `${path}/${id}`);
        if (step.hints !== undefined)
            requireStringArray(step, 'hints', `${path}/${id}`);
        if (step.spotlight !== undefined)
            validateSpotlight(step.spotlight, `${path}/${id}/spotlight`);
        if (step.distro_variants !== undefined)
            validateDistroVariants(step.distro_variants, `${path}/${id}`);
        if (step.phases !== undefined) {
            if (!Array.isArray(step.phases) || step.phases.length === 0)
                throw new ContentSchemaError('phases must be a non-empty array', `${path}/${id}`);
            for (const [index, phase] of step.phases.entries()) {
                const phasePath = `${path}/${id}/phases[${index}]`;
                if (!phase || typeof phase !== 'object')
                    throw new ContentSchemaError('phase must be an object', phasePath);
                const instruction = typeof phase.instruction === 'string' ? phase.instruction.trim() : '';
                const label = typeof phase.label === 'string' ? phase.label.trim() : '';
                if (!instruction && !label)
                    throw new ContentSchemaError('phase needs instruction or label', phasePath);
            }
        }
        break;
    case 'terminal':
    case 'challenge':
        requireString(step, 'instruction', `${path}/${id}`);
        if (step.fixture !== undefined && typeof step.fixture !== 'string')
            throw new ContentSchemaError('fixture must be a string', `${path}/${id}`);
        if (step.hints !== undefined)
            requireStringArray(step, 'hints', `${path}/${id}`);
        if (step.distro_variants !== undefined)
            validateDistroVariants(step.distro_variants, `${path}/${id}`);
        if (step.validate !== undefined) {
            const validate = step.validate;
            if (!validate || typeof validate !== 'object')
                throw new ContentSchemaError('validate must be an object', `${path}/${id}`);
            requireString(validate, 'pattern', `${path}/${id}/validate`);
            try {
                new RegExp(validate.pattern);
            } catch {
                throw new ContentSchemaError('validate.pattern is not a valid regex', `${path}/${id}`);
            }
            if (validate.expect_exit !== undefined && typeof validate.expect_exit !== 'number')
                throw new ContentSchemaError('validate.expect_exit must be a number', `${path}/${id}`);
        }
        break;
    case 'bridge':
        requireString(step, 'body', `${path}/${id}`);
        if (step.hints !== undefined)
            requireStringArray(step, 'hints', `${path}/${id}`);
        break;
    case 'practice':
        requireString(step, 'instruction', `${path}/${id}`);
        if (step.fixture !== undefined && typeof step.fixture !== 'string')
            throw new ContentSchemaError('fixture must be a string', `${path}/${id}`);
        break;
    }

    return { ...step, id, kind };
}

export function validateModule(module, sourcePath = '') {
    if (!module || typeof module !== 'object')
        throw new ContentSchemaError('module must be an object', sourcePath);

    const track = requireString(module, 'track', sourcePath);
    const trackTitle = requireString(module, 'track_title', sourcePath);
    const moduleId = requireString(module, 'module', sourcePath);
    const title = requireString(module, 'title', sourcePath);
    const order = typeof module.order === 'number' ? module.order : 100;

    if (!Array.isArray(module.steps) || module.steps.length === 0)
        throw new ContentSchemaError('steps must be a non-empty array', sourcePath);

    const steps = module.steps.map((step, index) =>
        validateStep(step, `${sourcePath}/steps[${index}]`));

    return {
        track,
        track_title: trackTitle,
        module: moduleId,
        title,
        order,
        steps,
        source_path: sourcePath,
    };
}

export function validatePackManifest(manifest, sourcePath = '') {
    if (!manifest || typeof manifest !== 'object')
        throw new ContentSchemaError('pack manifest must be an object', sourcePath);

    return {
        id: requireString(manifest, 'id', sourcePath),
        title: requireString(manifest, 'title', sourcePath),
        language: requireString(manifest, 'language', sourcePath),
    };
}
