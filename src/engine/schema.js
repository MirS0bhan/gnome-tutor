/* schema.js
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const STEP_KINDS = new Set(['contrast', 'gui', 'terminal', 'bridge']);

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
        break;
    case 'gui':
        requireString(step, 'instruction', `${path}/${id}`);
        requireString(step, 'target_app', `${path}/${id}`);
        if (step.fixture !== undefined && typeof step.fixture !== 'string')
            throw new ContentSchemaError('fixture must be a string', `${path}/${id}`);
        if (step.hints !== undefined)
            requireStringArray(step, 'hints', `${path}/${id}`);
        break;
    case 'terminal':
        requireString(step, 'instruction', `${path}/${id}`);
        if (step.fixture !== undefined && typeof step.fixture !== 'string')
            throw new ContentSchemaError('fixture must be a string', `${path}/${id}`);
        if (step.hints !== undefined)
            requireStringArray(step, 'hints', `${path}/${id}`);
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

    if (!Array.isArray(module.steps) || module.steps.length === 0)
        throw new ContentSchemaError('steps must be a non-empty array', sourcePath);

    const steps = module.steps.map((step, index) =>
        validateStep(step, `${sourcePath}/steps[${index}]`));

    return {
        track,
        track_title: trackTitle,
        module: moduleId,
        title,
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
