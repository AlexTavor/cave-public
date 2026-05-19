import { useContext } from "react";
import { EntityStateLinkContext } from "./EntityStateLinkContext";
import type { EntityStateLinkContextValue } from "./types";

export {
    EntityStateLinkProvider,
    EntityStateLinkContext,
} from "./EntityStateLinkContext";
export { useEntityBarRef } from "./useEntityBarRef";
export { useEntityTextRef } from "./useEntityTextRef";
export { createPathResolver, resolveNumericValue } from "./pathResolvers";
export {
    computePercentage,
    didVisualProgressChange,
    formatProgressTransform,
} from "./valueMath";
export type {
    EntityBarBinding,
    BarBindingInput,
    EntityStateLinkContextValue,
    EntityTextBinding,
    PathResolver,
} from "./types";

export const useEntityStateLink = (): EntityStateLinkContextValue => {
    const ctx = useContext(EntityStateLinkContext);
    if (!ctx)
        throw new Error(
            "useEntityStateLink must be used within an EntityStateLinkProvider",
        );
    return ctx;
};

