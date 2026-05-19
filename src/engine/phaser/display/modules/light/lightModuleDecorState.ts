import {
  AVATAR_AURA_PULSE_SCALE,
  AVATAR_SWARM_AURA_ALPHA,
  AVATAR_SWARM_AURA_SCALE,
  AVATAR_SWARM_AURA_TINT,
} from "../../avatar/AvatarDisplayConstants";
import type { DisplayTickContext } from "../../types";
import { BLEND_MODE_ADD } from "../../blendModes";
import type { LightState } from "./lightModule.types";
import { resolveAttributePoolKey } from "../attribute/attributePowerVisuals";

const toHex = (value: number) => `#${value.toString(16).padStart(6, "0")}`;
const pulse = (base: number, pulseValue: number, amount: number) =>
  base * (1 + pulseValue * amount);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const readBodyAuraColor = (tickCtx: DisplayTickContext): string | null => {
  const attrs = (tickCtx.entity as any).body?.attributes ?? {};
  const colors = tickCtx.pulseEngine.getAllNodeColors();
  const keys: Array<"body" | "mind" | "social"> = ["body", "mind", "social"];
  const strongest = [...keys].sort(
    (left, right) => (attrs[right] ?? 0) - (attrs[left] ?? 0),
  )[0];
  return strongest ? colors[strongest] : null;
};

export const resolveDecorLightState = (
  tickCtx: DisplayTickContext,
): LightState | null => {
  if (tickCtx.spec.display_key === "cave_level") {
    const render = (tickCtx.entity as any).cave?.mind?.render;
    const comfort = clamp01((tickCtx.entity as any).state?.comfort?.value ?? 1);
    if (!render) return null;
    return {
      kind: "point",
      alpha: 0.08 + comfort * 0.24,
      blendMode: BLEND_MODE_ADD,
      color: render.eyeColor,
      radius: tickCtx.spec.radius * (1.3 + comfort * 0.6),
    };
  }
  const attribute = resolveAttributePoolKey(tickCtx.spec.display_key);
  if (attribute) {
    const colors = tickCtx.pulseEngine.getAllNodeColors();
    return {
      kind: "point",
      alpha: AVATAR_SWARM_AURA_ALPHA,
      blendMode: BLEND_MODE_ADD,
      color: colors[attribute],
      radius: tickCtx.spec.radius * AVATAR_SWARM_AURA_SCALE,
    };
  }
  if (tickCtx.spec.display_key === "body_avatar") {
    const color = readBodyAuraColor(tickCtx);
    if (!color) return null;
    return {
      kind: "point",
      alpha: AVATAR_SWARM_AURA_ALPHA,
      blendMode: BLEND_MODE_ADD,
      color,
      radius:
        tickCtx.spec.radius *
        pulse(
          AVATAR_SWARM_AURA_SCALE,
          tickCtx.pulseValue,
          AVATAR_AURA_PULSE_SCALE,
        ),
    };
  }
  if (tickCtx.spec.display_key === "swarm_avatar") {
    return {
      kind: "point",
      alpha: AVATAR_SWARM_AURA_ALPHA,
      blendMode: BLEND_MODE_ADD,
      color: toHex(AVATAR_SWARM_AURA_TINT),
      radius:
        tickCtx.spec.radius *
        pulse(
          AVATAR_SWARM_AURA_SCALE,
          tickCtx.pulseValue,
          AVATAR_AURA_PULSE_SCALE,
        ),
    };
  }
  return null;
};
