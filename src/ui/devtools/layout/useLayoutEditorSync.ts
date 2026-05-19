import { useEffect, useRef } from "react";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { deepClone } from "../../../utils/objectUtils";
import {
    EPSILON,
    getLayoutRuntimeBlueprintIds,
} from "./layoutEditorBlueprints";

interface LayoutEditorSyncInput {
    runtime: Runtime | null;
    sessionDraft: ModuleCartridge | null | undefined;
    rehydrateRuntime: (nextDraft: ModuleCartridge) => void;
    setModuleDraft: (draft: ModuleCartridge | null) => void;
}

const getRuntimeDraftIds = (
    runtime: Runtime,
    blueprints: ModuleCartridge["blueprints"],
): string[] =>
    runtime
        .getEntities()
        .map((entity) => entity.id)
        .filter(
            (id): id is string =>
                typeof id === "string" && Object.hasOwn(blueprints, id),
        );

const shouldRehydrate = (draftIds: string[], runtimeIds: string[]): boolean => {
    if (draftIds.length !== runtimeIds.length) return true;
    const runtimeIdSet = new Set(runtimeIds);
    return draftIds.some((id) => !runtimeIdSet.has(id));
};

export const useLayoutEditorSync = ({
    runtime,
    sessionDraft,
    rehydrateRuntime,
    setModuleDraft,
}: LayoutEditorSyncInput): void => {
    // Track the last draft we successfully sent to rehydration to prevent
    // infinite loops if the runtime fails to spawn entities (e.g. invalid schemas)
    const lastRehydratedDraftRef = useRef<ModuleCartridge | null>(null);

    useEffect(() => {
        if (!runtime || !sessionDraft) return;

        const draftBlueprints = sessionDraft.blueprints ?? {};
        const draftIds = getLayoutRuntimeBlueprintIds(draftBlueprints);
        const runtimeIds = getRuntimeDraftIds(runtime, draftBlueprints);

        // If the draft object reference hasn't changed since our last attempt,
        // we shouldn't try to rehydrate again even if there's a mismatch.
        // This breaks the infinite loop if a blueprint is valid in draft but fails to spawn in runtime.
        const isSameDraft = lastRehydratedDraftRef.current === sessionDraft;

        if (!isSameDraft && shouldRehydrate(draftIds, runtimeIds)) {
            lastRehydratedDraftRef.current = sessionDraft;
            rehydrateRuntime(sessionDraft);
            return;
        }

        for (const id of Object.keys(draftBlueprints)) {
            const physics = draftBlueprints[id]?.components?.physics;
            if (!physics) continue;

            const body = runtime.getPhysicsBody(id);
            if (!body) continue;

            const needsUpdate =
                Math.abs(body.position.x - physics.x) > EPSILON ||
                Math.abs(body.position.y - physics.y) > EPSILON ||
                Math.abs(body.radius - physics.radius) > EPSILON;

            if (!needsUpdate) continue;

            body.position.x = physics.x;
            body.position.y = physics.y;
            body.prevPosition.x = physics.x;
            body.prevPosition.y = physics.y;
            body.x = physics.x;
            body.y = physics.y;
            body.radius = physics.radius;
        }

        setModuleDraft(deepClone(sessionDraft));
    }, [rehydrateRuntime, runtime, sessionDraft, setModuleDraft]);
};

