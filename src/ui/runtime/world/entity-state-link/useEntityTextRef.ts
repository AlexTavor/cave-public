import { useContext, useLayoutEffect, useRef } from "react";
import type { EntityTextBinding } from "./types";
import { EntityStateLinkContext } from "./EntityStateLinkContext";

const NOOP_LINK = {
    registerText: () => undefined,
    unregisterText: () => undefined,
};

export const useEntityTextRef = <TElement extends HTMLElement = HTMLDivElement>(
    binding: EntityTextBinding,
) => {
    const stateLink = useContext(EntityStateLinkContext) ?? NOOP_LINK;
    const ref = useRef<TElement | null>(null);
    const { id, kind, entityId } = binding;
    const fallbackText =
        "fallbackText" in binding ? binding.fallbackText : undefined;
    const format = "format" in binding ? binding.format : undefined;
    const multiplier = "multiplier" in binding ? binding.multiplier : undefined;
    const valuePath = "valuePath" in binding ? binding.valuePath : undefined;
    const maxPath = "maxPath" in binding ? binding.maxPath : undefined;
    const maxValue = "maxValue" in binding ? binding.maxValue : undefined;
    const suffix = "suffix" in binding ? binding.suffix : undefined;

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return undefined;
        stateLink.registerText(id, binding, element);
        return () => stateLink.unregisterText(id);
    }, [
        entityId,
        fallbackText,
        format,
        id,
        kind,
        maxPath,
        maxValue,
        multiplier,
        stateLink,
        suffix,
        valuePath,
    ]);

    return ref;
};
