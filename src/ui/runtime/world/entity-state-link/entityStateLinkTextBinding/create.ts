import { createPathResolver } from "../pathResolvers";
import type { EntityTextBinding } from "../types";
import type { InternalTextBinding } from "./bindingTypes";

export const createInternalTextBinding = (
    binding: EntityTextBinding,
    element: HTMLElement,
): InternalTextBinding => ({
    ...binding,
    element,
    valueResolver:
        binding.kind === "cycle-countdown"
            ? undefined
            : createPathResolver(binding.valuePath),
    maxResolver:
        binding.kind === "remaining-duration-ms" ||
        (binding.kind === "compact-fraction" && binding.maxPath)
            ? createPathResolver(binding.maxPath)
            : undefined,
});
