import { useEffect, useState } from "react";
import type { Runtime } from "../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import { runtimeInspectorStore } from "./runtimeInspectorStore";

const resolveTitle = (entityId: string, entity: RuntimeEntity): string => {
    if (typeof entity.label === "string") return entity.label;
    if (typeof entity.blueprintId === "string") return entity.blueprintId;
    return entityId;
};

const toInspectorView = (entityId: string, entity: RuntimeEntity) => ({
    title: resolveTitle(entityId, entity),
    entityText: JSON.stringify(entity, null, 2),
});

export const useRuntimeInspectorEntity = (
    runtime: Runtime,
    windowId: string,
    entityId: string,
) => {
    const [view, setView] = useState(() => {
        const entity = runtime.getEntity(entityId);
        return entity
            ? toInspectorView(entityId, entity)
            : { title: entityId, entityText: "{}" };
    });

    useEffect(() => {
        let frame = 0;
        const poll = () => {
            const entity = runtime.getEntity(entityId);
            if (!entity) {
                runtimeInspectorStore.getState().closeWindow(windowId);
                return;
            }
            const next = toInspectorView(entityId, entity);
            setView((current) =>
                current.title === next.title &&
                current.entityText === next.entityText
                    ? current
                    : next,
            );
            frame = globalThis.requestAnimationFrame(poll);
        };
        frame = globalThis.requestAnimationFrame(poll);
        return () => globalThis.cancelAnimationFrame(frame);
    }, [entityId, runtime, windowId]);

    return view;
};
