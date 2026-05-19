import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { BodyCard } from "./body/BodyCard.tsx";
import { CaveCard } from "./cave/CaveCard.tsx";
import { DisplayCard } from "./DisplayCard.tsx";
import { JobCard } from "./job-card/JobCard.tsx";
import { ResourceCard } from "./ResourceCard.tsx";
import { TransferCard } from "./TransferCard.tsx";
import type { SelectionLens } from "./selectionTypes";
import {
    resolveBodyWithBlueprint,
    resolveEntityDisplay,
    resolvePowerSink,
} from "./selectionUtils";
import { isProcessingAssignmentNode } from "../../../../game/assignment/assignmentNodeKinds";
import { resolveStorageAbilityBars } from "./ability-display/resolveStorageAbilityBars";

const hasTag = (entity: RuntimeEntity, tag: string): boolean => {
    const tags = (entity as { tags?: string[] }).tags;
    return Array.isArray(tags) && tags.includes(tag);
};

const isResourceEntity = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): boolean => {
    return resolveStorageAbilityBars(entity, runtime).length > 0;
};

const isTransferEntity = (entity: RuntimeEntity): boolean =>
    hasTag(entity, "pending_transfer") ||
    !!(entity as { transfer?: unknown }).transfer;

// Priority Order: Cave > Body > Transfer > Job > Resource
export const LENS_MAP: SelectionLens[] = [
    {
        id: "cave",
        match: (entity) => entity.id === "sys_world",
        Component: CaveCard,
    },
    {
        id: "body",
        match: (entity, runtime) => !!resolveBodyWithBlueprint(entity, runtime),
        Component: BodyCard,
    },
    {
        id: "transfer",
        match: (entity) => isTransferEntity(entity),
        Component: TransferCard,
    },
    {
        id: "job",
        match: (entity) =>
            !!resolvePowerSink(entity) || isProcessingAssignmentNode(entity),
        Component: JobCard,
    },
    {
        id: "resource",
        match: (entity, runtime) => isResourceEntity(entity, runtime),
        Component: ResourceCard,
    },
    {
        id: "display",
        match: (entity, runtime) => !!resolveEntityDisplay(entity, runtime),
        Component: DisplayCard,
    },
];

export const resolveSelectionLens = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): SelectionLens | null =>
    LENS_MAP.find((lens) => lens.match(entity, runtime)) ?? null;

