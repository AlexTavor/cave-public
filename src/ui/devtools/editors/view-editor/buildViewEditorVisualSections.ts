import type { ViewEditorAdapter } from "./ViewEditor.types";

export const buildViewEditorVisualSections = (params: {
    styleDraft: any;
    actions: any;
    radiusDraft?: { min: number; max: number } | null;
}): Pick<
    ViewEditorAdapter,
    "cycleProgress" | "light" | "transferNodeRadius"
> => ({
    cycleProgress: params.styleDraft.cycleProgress
        ? {
              family: params.styleDraft.cycleProgress.family,
              familyRotationDeg:
                  params.styleDraft.cycleProgress.familyRotationDeg,
              color: params.styleDraft.cycleProgress.color,
              updateFamily: params.actions.updateCycleProgressFamily,
              updateFamilyRotation:
                  params.actions.updateCycleProgressFamilyRotation,
              updateColor: params.actions.updateCycleProgressColor,
          }
        : null,
    light: {
        enabled: Boolean(params.styleDraft.light),
        color:
            params.styleDraft.light?.color ??
            params.styleDraft.cycleProgress?.color ??
            "#ffffff",
        alpha: params.styleDraft.light?.alpha ?? 0.5,
        radiusFactor: params.styleDraft.light?.radiusFactor ?? 1.5,
        blendMode: params.styleDraft.light?.blendMode ?? "ADD",
        updateEnabled: params.actions.updateLightEnabled,
        updateColor: params.actions.updateLightColor,
        updateAlpha: params.actions.updateLightAlpha,
        updateRadiusFactor: params.actions.updateLightRadiusFactor,
        updateBlendMode: params.actions.updateLightBlendMode,
    },
    transferNodeRadius:
        params.radiusDraft &&
        params.actions.updateRadiusMin &&
        params.actions.updateRadiusMax
            ? {
                  min: params.radiusDraft.min,
                  max: params.radiusDraft.max,
                  updateMin: params.actions.updateRadiusMin,
                  updateMax: params.actions.updateRadiusMax,
              }
            : null,
});
