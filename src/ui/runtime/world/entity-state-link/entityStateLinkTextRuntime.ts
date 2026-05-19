import { readRuntimeEntity } from "./entityStateLinkRuntime.helpers";
export { entityTextBindingEqual } from "./entityStateLinkTextBinding";
import { resolveText } from "./entityStateLinkTextBinding";
import type {
    InternalTextBinding,
    RuntimeLike,
} from "./entityStateLinkTextBinding";

export const TEXT_SYNC_INTERVAL_MS = 33;

export const syncSingleEntityTextBinding = (
    runtime: RuntimeLike,
    binding: InternalTextBinding,
    entityIndex: Map<string, any>,
) => {
    const entity = readRuntimeEntity(runtime, entityIndex, binding.entityId);
    const nextText = resolveText(runtime, binding, entity);
    if (binding.element.textContent !== nextText)
        binding.element.textContent = nextText;
};

export const syncEntityTextBindings = (
    runtime: RuntimeLike,
    registry: Map<string, InternalTextBinding>,
    entityIndex: Map<string, any>,
    dirtyEntityIds: Set<string>,
    forceAll: boolean,
) => {
    entityIndex.clear();
    for (const binding of registry.values()) {
        if (!forceAll && !dirtyEntityIds.has(binding.entityId)) continue;
        syncSingleEntityTextBinding(runtime, binding, entityIndex);
    }
};
