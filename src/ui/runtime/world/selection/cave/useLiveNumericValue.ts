import { useEffect, useRef } from "react";
import type { RuntimeInvalidationReader } from "../../../../../engine/runtime/runtimeInvalidationTypes";
import { useRuntimeRevisionToken } from "../../../hooks/useRuntimeRevisionToken";

type RuntimeWithLiveValue = {
    getEntity: (id: string) => any;
    getInvalidation?: () => RuntimeInvalidationReader;
};

type LiveNumericValueArgs = {
    runtime: RuntimeWithLiveValue | null;
    entityId: string;
    path: string;
    formatter: (val: number) => string;
};

export const useLiveNumericValue = ({
    runtime,
    entityId,
    path,
    formatter,
}: LiveNumericValueArgs) => {
    const subscribingRuntime = runtime?.getInvalidation
        ? (runtime as RuntimeWithLiveValue & {
              getInvalidation: () => RuntimeInvalidationReader;
          })
        : null;
    const token = useRuntimeRevisionToken(subscribingRuntime, {
        entityIds: [entityId],
        includeEntityListRevision: false,
        includeBlueprintRevision: false,
    });
    const spanRef = useRef<HTMLSpanElement>(null);
    const lastTextRef = useRef<string>("");

    useEffect(() => {
        if (!runtime || !entityId) return;
        const segments = path
            .replace("self.", "")
            .replace("global.", "")
            .split(".");

        const entity = runtime.getEntity(entityId);
        if (entity && spanRef.current) {
            let current = entity;
            for (const segment of segments) {
                if (current == null) break;
                current = current[segment];
            }
            const val =
                typeof current === "number" ? current : (current?.value ?? 0);
            const text = formatter(val);
            if (lastTextRef.current !== text) {
                spanRef.current.textContent = text;
                lastTextRef.current = text;
            }
        }
    }, [entityId, formatter, path, runtime, token]);

    return spanRef;
};

