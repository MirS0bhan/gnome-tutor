/* journeyHelpers.js — breadcrumb and overview label helpers.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function breadcrumbLabel(module, stepIndex, stepTotal) {
    const trackTitle = module.track_title ?? module.track;
    const stepPart = _('Step %1$d of %2$d').format(stepIndex + 1, stepTotal);
    if (module.track === 'orientation' && module.module === 'desktop-basics')
        return _('%1$s · %2$s').format(trackTitle, stepPart);
    return _('%1$s · %2$s · %3$s').format(trackTitle, module.title, stepPart);
}

export function trackOverviewButtonLabel(track, progressStore) {
    const progress = progressStore.trackProgress(track);
    if (progress.done)
        return _('Review');
    if (progress.started)
        return _('Continue');
    return _('Begin');
}

export function moduleOverviewButtonLabel(module, progressStore) {
    const progress = progressStore.moduleProgress(module);
    if (progress.done)
        return _('Review');
    if (progress.started)
        return _('Continue');
    return _('Begin');
}

export function firstIncompleteStepIndex(module, progressStore) {
    for (const [index, step] of module.steps.entries()) {
        const key = `${module.track}/${module.module}/${step.id}`;
        if (!progressStore.isStepCompleted(key))
            return index;
    }
    return 0;
}

export function firstIncompleteModule(track, progressStore) {
    for (const module of track.modules) {
        if (!progressStore.isModuleCompleted(`${module.track}/${module.module}`))
            return module;
        const progress = progressStore.moduleProgress(module);
        if (!progress.done)
            return module;
    }
    return track.modules[0] ?? null;
}

export function bridgeButtonLabel(step, module, curriculum) {
    if (step.cta_label)
        return step.cta_label;

    const trackIndex = curriculum?.tracks?.findIndex(t => t.id === module.track) ?? -1;
    const nextTrack = trackIndex >= 0 ? curriculum.tracks[trackIndex + 1] : null;
    if (nextTrack)
        return _('Next: %s →').format(nextTrack.title);

    return _('Next lesson →');
}

export function nextModuleInTrack(track, currentModule) {
    const index = track.modules.findIndex(m => m.module === currentModule.module);
    if (index < 0 || index + 1 >= track.modules.length)
        return null;
    return track.modules[index + 1];
}

export function trackById(curriculum, trackId) {
    return curriculum?.tracks?.find(track => track.id === trackId) ?? null;
}
