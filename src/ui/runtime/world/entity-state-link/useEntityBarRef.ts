import { useContext, useLayoutEffect, useRef } from "react";
import type { EntityBarBinding } from "./types";
import { EntityStateLinkContext } from "./EntityStateLinkContext";

const NOOP_LINK = {
    register: () => undefined,
    unregister: () => undefined,
};

export const useEntityBarRef = (binding: EntityBarBinding) => {
    const stateLink = useContext(EntityStateLinkContext) ?? NOOP_LINK;
    const ref = useRef<HTMLDivElement | null>(null);

    const { id, entityId, valuePath, maxPath, maxValue } = binding;

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return undefined;

        stateLink.register(
            id,
            { entityId, valuePath, maxPath, maxValue },
            element,
        );
        return () => stateLink.unregister(id);
    }, [id, entityId, valuePath, maxPath, maxValue, stateLink]);

    return ref;
};

