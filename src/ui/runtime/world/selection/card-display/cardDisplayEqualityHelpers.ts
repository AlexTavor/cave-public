import { entityTextBindingEqual } from "../../entity-state-link/entityStateLinkTextBinding";
import type {
    CardDescriptionModel,
    CardTitleModel,
    TooltipModel,
    ValueCapsuleModel,
} from "./cardDisplayTypes";

export const listEqual = <T>(
    left: readonly T[] | undefined,
    right: readonly T[] | undefined,
    equal: (left: T, right: T) => boolean,
) => {
    const leftList = left ?? [];
    const rightList = right ?? [];
    if (leftList.length !== rightList.length) return false;
    return leftList.every((item, index) => {
        const candidate = rightList[index];
        return candidate !== undefined && equal(item, candidate);
    });
};

export const actionEqual = (
    left?: ValueCapsuleModel["action"],
    right?: ValueCapsuleModel["action"],
) =>
    left?.id === right?.id &&
    left?.label === right?.label &&
    left?.kind === right?.kind &&
    left?.entryId === right?.entryId &&
    left?.disabled === right?.disabled &&
    left?.callback === right?.callback;

export const tooltipEqual = (left?: TooltipModel, right?: TooltipModel) =>
    left?.title === right?.title &&
    left?.content === right?.content &&
    left?.placement === right?.placement &&
    listEqual(left?.lines, right?.lines, (a, b) => a === b);

export const titleEqual = (left?: CardTitleModel, right?: CardTitleModel) =>
    left?.id === right?.id &&
    left?.text === right?.text &&
    left?.iconId === right?.iconId &&
    left?.avatar?.subjectId === right?.avatar?.subjectId &&
    left?.avatar?.fallbackIconId === right?.avatar?.fallbackIconId &&
    left?.avatar?.size === right?.avatar?.size &&
    tooltipEqual(left?.tooltip, right?.tooltip) &&
    actionEqual(left?.action, right?.action);

export const descriptionEqual = (
    left?: CardDescriptionModel,
    right?: CardDescriptionModel,
) =>
    left?.id === right?.id &&
    left?.text === right?.text &&
    left?.variant === right?.variant &&
    left?.maxLines === right?.maxLines &&
    tooltipEqual(left?.tooltip, right?.tooltip) &&
    actionEqual(left?.action, right?.action);

export const effectEqual = (
    left: ValueCapsuleModel["effects"][number],
    right: ValueCapsuleModel["effects"][number],
) =>
    left.id === right.id &&
    left.text === right.text &&
    left.tone === right.tone &&
    left.sourceLabel === right.sourceLabel &&
    left.targetKey === right.targetKey;

export const progressEqual = (
    left?: ValueCapsuleModel["progress"],
    right?: ValueCapsuleModel["progress"],
) =>
    left?.id === right?.id &&
    left?.entityId === right?.entityId &&
    left?.valuePath === right?.valuePath &&
    left?.maxPath === right?.maxPath &&
    left?.maxValue === right?.maxValue &&
    left?.color === right?.color;

const hasBinding = (
    value?: ValueCapsuleModel["value"],
): value is Extract<ValueCapsuleModel["value"], { binding: unknown }> =>
    !!value && "binding" in value && value.binding !== undefined;

export const valueEqual = (
    left?: ValueCapsuleModel["value"],
    right?: ValueCapsuleModel["value"],
) => {
    if (!left || !right) return left === right;
    if (hasBinding(left) || hasBinding(right)) {
        return (
            hasBinding(left) &&
            hasBinding(right) &&
            entityTextBindingEqual(left.binding, right.binding) &&
            left.ariaLabel === right.ariaLabel &&
            left.maxText === right.maxText
        );
    }
    return (
        left.text === right.text &&
        left.maxText === right.maxText &&
        left.ariaLabel === right.ariaLabel
    );
};
