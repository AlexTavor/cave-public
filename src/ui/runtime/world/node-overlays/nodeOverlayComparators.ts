import { entityTextBindingEqual } from "../entity-state-link/entityStateLinkTextRuntime";
import type {
    CompactBarBinding,
    ResolvedNodeOverlayEntry,
    ResolvedNodeOverlayModel,
} from "./nodeOverlayTypes";

const samePresence = <T>(l: T | null | undefined, r: T | null | undefined) =>
    l == null && r == null;

const hasLiveValue = (
    entry: ResolvedNodeOverlayEntry,
): entry is ResolvedNodeOverlayEntry & {
    valueBinding: NonNullable<ResolvedNodeOverlayEntry["valueBinding"]>;
} => "valueBinding" in entry;

const hasStaticValue = (
    entry: ResolvedNodeOverlayEntry,
): entry is ResolvedNodeOverlayEntry & {
    valueText: NonNullable<ResolvedNodeOverlayEntry["valueText"]>;
} => "valueText" in entry;

const valueEqual = (
    l: ResolvedNodeOverlayEntry,
    r: ResolvedNodeOverlayEntry,
) => {
    if (hasLiveValue(l) || hasLiveValue(r)) {
        if (!hasLiveValue(l) || !hasLiveValue(r)) return false;
        return entityTextBindingEqual(l.valueBinding, r.valueBinding);
    }
    if (hasStaticValue(l) || hasStaticValue(r)) {
        return (
            hasStaticValue(l) &&
            hasStaticValue(r) &&
            l.valueText === r.valueText
        );
    }
    return (
        !hasLiveValue(l) &&
        !hasLiveValue(r) &&
        !hasStaticValue(l) &&
        !hasStaticValue(r)
    );
};

export const nodeOverlayBarIdentityEqual = (
    left?: CompactBarBinding | null,
    right?: CompactBarBinding | null,
) => {
    if (left === right) return true;
    if (!left || !right) return samePresence(left, right);
    return (
        left.id === right.id &&
        left.entityId === right.entityId &&
        left.valuePath === right.valuePath &&
        left.maxPath === right.maxPath &&
        left.maxValue === right.maxValue &&
        left.color === right.color
    );
};

export const nodeOverlayBarSnapshotEqual = (
    left?: CompactBarBinding | null,
    right?: CompactBarBinding | null,
) => {
    if (!left || !right) return nodeOverlayBarIdentityEqual(left, right);
    return (
        nodeOverlayBarIdentityEqual(left, right) &&
        left.current === right.current &&
        left.max === right.max
    );
};

export const nodeOverlayEntryEqual = (
    left?: ResolvedNodeOverlayEntry | null,
    right?: ResolvedNodeOverlayEntry | null,
) => {
    if (left === right) return true;
    if (!left || !right) return samePresence(left, right);
    return (
        left.entityId === right.entityId &&
        left.kind === right.kind &&
        left.label === right.label &&
        valueEqual(left, right) &&
        nodeOverlayBarIdentityEqual(left.bar, right.bar)
    );
};

export const nodeOverlayModelEqual = (
    left?: ResolvedNodeOverlayModel | null,
    right?: ResolvedNodeOverlayModel | null,
) => {
    if (left === right) return true;
    if (!left || !right) return samePresence(left, right);
    return (
        nodeOverlayEntryEqual(left, right) &&
        left.position.x === right.position.x &&
        left.position.y === right.position.y
    );
};

export const nodeOverlayCardRenderEqual = (
    left?: ResolvedNodeOverlayModel | null,
    right?: ResolvedNodeOverlayModel | null,
) => {
    if (left === right) return true;
    if (!left || !right) return samePresence(left, right);
    return (
        left.entityId === right.entityId &&
        left.kind === right.kind &&
        left.label === right.label &&
        valueEqual(left, right) &&
        left.position.x === right.position.x &&
        left.position.y === right.position.y &&
        nodeOverlayBarIdentityEqual(left.bar, right.bar)
    );
};
