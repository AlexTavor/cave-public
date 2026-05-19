import type { RuntimeEntity } from "../../../../runtime/types";
import { BLEND_MODE_ADD } from "../../blendModes";
import { readCycleProgress } from "../cycle-progress/cycleProgressReader";
import type { LightState } from "./lightModule.types";

const DEFAULT_CYCLE_LIGHT = { color: "#8888ff", alpha: 1 };
const PRODUCER_MIN_SCALE = 0.3;
const PRODUCER_MAX_SCALE = 1.5;
const PRODUCER_LIGHTS = {
  wood: { color: "#8B4513", alpha: 1 },
  food: { color: "#FF5722", alpha: 1 },
  heat: { color: "#FF9800", alpha: 1 },
  xp: { color: "#FFC107", alpha: 1 },
} as const;

const scoreState = (entry: any): number =>
  (entry?.allowWithdraw === true && entry?.allowDeposit === false ? 4 : 0) +
  (entry?.visible === false ? 2 : 0) +
  (typeof entry?.max === "number" ? 0 : 1) -
  (entry?.allowDeposit === true ? 2 : 0);

const readProducerResource = (entity: RuntimeEntity) => {
  let best: keyof typeof PRODUCER_LIGHTS | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const [key, entry] of Object.entries((entity as any).state ?? {})) {
    if (key === "cycle" || key === "cycle_active" || !(key in PRODUCER_LIGHTS))
      continue;
    const score = scoreState(entry);
    if (score > bestScore) {
      best = key as keyof typeof PRODUCER_LIGHTS;
      bestScore = score;
    }
  }
  return best;
};

export const resolveBaseLightState = (
  entity: RuntimeEntity,
  radius: number,
): LightState | null => {
  const scale = resolveCycleLightScale(entity);
  if (scale == null) return null;
  const resource = readProducerResource(entity);
  const visual = resource ? PRODUCER_LIGHTS[resource] : DEFAULT_CYCLE_LIGHT;
  return {
    kind: "point",
    alpha: visual.alpha,
    blendMode: BLEND_MODE_ADD,
    color: visual.color,
    radius: radius * scale,
  };
};

export const resolveCycleLightScale = (
  entity: RuntimeEntity,
): number | null => {
  const cycle = readCycleProgress(entity);
  if (cycle.kind !== "valid") return null;
  const progress = Math.max(0, Math.min(1, cycle.value / cycle.max));
  return (
    PRODUCER_MIN_SCALE + (PRODUCER_MAX_SCALE - PRODUCER_MIN_SCALE) * progress
  );
};
