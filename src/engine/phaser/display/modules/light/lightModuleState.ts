import type { DisplayTickContext } from "../../types";
import { BLEND_MODE_ADD, BLEND_MODE_NORMAL } from "../../blendModes";
import {
  resolveBaseLightState,
  resolveCycleLightScale,
} from "./lightModuleBaseState";
import { resolveDecorLightState } from "./lightModuleDecorState";

export type { LightState } from "./lightModule.types";
import type { LightState } from "./lightModule.types";

export const parseHexColor = (hex: string) => Number.parseInt(hex.slice(1), 16);

export const parseRgb = (hex: string) => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const resolveStyleLightState = (
  tickCtx: DisplayTickContext,
): LightState | null => {
  const light = tickCtx.spec.style?.light;
  if (!light) return null;
  const cycleScale = resolveCycleLightScale(tickCtx.entity) ?? 1;
  return {
    kind: "point",
    alpha: light.alpha,
    blendMode: light.blendMode === "ADD" ? BLEND_MODE_ADD : BLEND_MODE_NORMAL,
    color: light.color,
    radius: tickCtx.spec.radius * light.radiusFactor * cycleScale,
  };
};

export const resolveLightState = (
  tickCtx: DisplayTickContext,
): LightState | null => {
  if (
    (tickCtx.entity as { __attentionLightSuppressed?: boolean })
      .__attentionLightSuppressed
  ) {
    return null;
  }
  return (
    resolveStyleLightState(tickCtx) ??
    resolveBaseLightState(tickCtx.entity, tickCtx.spec.radius) ??
    resolveDecorLightState(tickCtx)
  );
};
