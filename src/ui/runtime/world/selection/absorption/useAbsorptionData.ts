import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { useEntitySelector } from "../useEntitySelector";

const BODY_SELECTOR_FACT_ABOUT = "world";

const selectAssignedIds = (entity: RuntimeEntity) =>
    (entity as any).assignment?.assignedIds ?? [];

const selectDuration = (entity: RuntimeEntity) =>
    (entity as any).state?.absorption_duration?.value ?? 100;

const selectIsSelectorOpen = (entity: RuntimeEntity) =>
    Number(
        (entity as any).run?.body_selector_open?.[BODY_SELECTOR_FACT_ABOUT],
    ) > 0;

export const useAbsorptionData = (entity: RuntimeEntity, runtime: Runtime) => {
    const assignedIds =
        useEntitySelector(runtime, entity.id, selectAssignedIds) ?? [];

    const duration =
        useEntitySelector(runtime, entity.id, selectDuration) ?? 100;

    const isSelectorOpen =
        useEntitySelector(runtime, "sys_world", selectIsSelectorOpen) ?? false;

    return { assignedIds, duration, isSelectorOpen };
};

