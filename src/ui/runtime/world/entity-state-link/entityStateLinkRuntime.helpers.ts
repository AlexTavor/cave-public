import { createPathResolver, resolveNumericValue } from "./pathResolvers";
import {
  computePercentage,
  didVisualProgressChange,
  formatProgressTransform,
} from "./valueMath";
import type { BarBindingInput } from "./types";
import type {
  InternalBarBinding,
  RuntimeLike,
} from "./entityStateLinkRuntime.types";

export const createBarBinding = (
  binding: BarBindingInput,
  element: HTMLElement,
): InternalBarBinding => ({
  entityId: binding.entityId,
  valueResolver: createPathResolver(binding.valuePath),
  maxResolver: binding.maxPath
    ? createPathResolver(binding.maxPath)
    : undefined,
  maxValue: binding.maxValue,
  element,
});

export const readRuntimeEntity = (
  runtime: RuntimeLike,
  index: Map<string, any>,
  id: string,
) => {
  if (runtime.getEntity) return runtime.getEntity(id);
  if (index.size === 0)
    for (const entity of runtime.getEntities?.() ?? [])
      if (entity?.id) index.set(entity.id, entity);
  return index.get(id);
};

export const updateBarProgress = (
  binding: InternalBarBinding,
  currentValue: unknown,
  maxValue: unknown,
) => {
  const progress = computePercentage(
    resolveNumericValue(currentValue),
    resolveNumericValue(maxValue),
    binding.maxValue,
  );
  const transform = formatProgressTransform(progress);
  const current = binding.element.dataset.progress ?? "";
  if (
    !didVisualProgressChange(
      binding.element.style.transform,
      current,
      transform,
      progress,
    )
  )
    return;
  binding.element.style.transform = transform;
  binding.element.dataset.progress = String(progress);
};

export const updateBarEntityCount = (
  counts: Map<string, number>,
  entityId: string,
  delta: number,
) => {
  const next = (counts.get(entityId) ?? 0) + delta;
  if (next > 0) counts.set(entityId, next);
  else counts.delete(entityId);
  return next;
};
