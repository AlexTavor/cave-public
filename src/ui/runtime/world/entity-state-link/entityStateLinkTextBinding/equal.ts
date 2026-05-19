import type { EntityTextBinding } from "../types";

export const entityTextBindingEqual = (
    left: EntityTextBinding,
    right: EntityTextBinding,
) => {
    if (
        left.kind !== right.kind ||
        left.id !== right.id ||
        left.entityId !== right.entityId
    )
        return false;
    if (left.kind === "cycle-countdown") return true;
    if (
        left.kind === "remaining-duration-ms" &&
        right.kind === "remaining-duration-ms"
    )
        return (
            left.valuePath === right.valuePath && left.maxPath === right.maxPath
        );
    if (left.kind === "compact-fraction" && right.kind === "compact-fraction")
        return (
            left.valuePath === right.valuePath &&
            left.maxPath === right.maxPath &&
            left.maxValue === right.maxValue
        );
    return (
        left.kind === "numeric-text" &&
        right.kind === "numeric-text" &&
        left.valuePath === right.valuePath &&
        left.format === right.format &&
        left.multiplier === right.multiplier &&
        left.suffix === right.suffix &&
        left.fallbackText === right.fallbackText
    );
};
